/* eslint-disable no-shadow */

'use strict'

const { assert } = require('chai')
const surch = require('.')

test('create does not throw with valid targetKey', () =>
  assert.doesNotThrow(() => surch.create('foo'))
)

test('create throws with missing targetKey', () =>
  assert.throws(() => surch.create())
)

test('create throws with empty targetKey', () =>
  assert.throws(() => surch.create(''))
)

test('create throws with invalid targetKey', () =>
  assert.throws(() => surch.create({}))
)

test('create throws with empty idKey', () =>
  assert.throws(() => surch.create('foo', { idKey: '' }))
)

test('create throws with invalid idKey', () =>
  assert.throws(() => surch.create('foo', { idKey: {} }))
)

test('create throws with invalid minLength', () =>
  assert.throws(() => surch.create('foo', { minLength: 3.5 }))
)

test('create throws with negative minLength', () =>
  assert.throws(() => surch.create('foo', { minLength: -3 }))
)

suite('create with default arguments:', () => {
  let index

  setup(() =>
    index = surch.create('foo')
  )

  test('index has two properties', () =>
    assert.lengthOf(Object.keys(index), 2)
  )

  test('index has addDocument method', () =>
    assert.isFunction(index.addDocument)
  )

  test('addDocument expects 1 argument', () =>
    assert.lengthOf(index.addDocument, 1)
  )

  test('index has search method', () =>
    assert.isFunction(index.search)
  )

  test('search expects 1 argument', () =>
    assert.lengthOf(index.search, 1)
  )

  test('addDocument throws with invalid property', () =>
    assert.throws(() => index.addDocument({ _id: 0, foo: {} }))
  )

  test('addDocument throws with missing id', () =>
    assert.throws(() => index.addDocument({ _id: null, foo: 'bar' }))
  )

  test('addDocument does not throw with missing value', () =>
    assert.doesNotThrow(() => index.addDocument({ _id: 0 }))
  )

  test('addDocument does not throw with short value', () =>
    assert.doesNotThrow(() => index.addDocument({ _id: 0, foo: 'ba' }))
  )

  test('search throws with invalid query', () =>
    assert.throws(() => index.search({}))
  )

  test('search throws with short query', () =>
    assert.throws(() => index.search('ba'))
  )

  test('search returns empty array with no matches', () =>
    assert.deepEqual(index.search('bar'), [])
  )

  suite('addDocument with minimum length property:', () => {
    setup(() =>
      index.addDocument({ _id: 0, foo: 'bar' })
    )

    test('addDocument throws with duplicate id', () =>
      assert.throws(() => index.addDocument({ _id: 0, foo: 'bar' }))
    )

    test('search returns result array with 1 match', () =>
      assert.deepEqual(index.search('bar'), [
        { id: 0, match: 'bar', indices: [ 0 ], score: 100 }
      ])
    )

    suite('addDocument with overlapping length property:', () => {
      setup(() =>
        index.addDocument({ _id: 1, foo: 'barb' })
      )

      test('search returns result array with 2 matches', () =>
        assert.deepEqual(index.search('bar'), [
          { id: 0, match: 'bar', indices: [ 0 ], score: 100 },
          { id: 1, match: 'barb', indices: [ 0 ], score: 75 }
        ])
      )

      test('search returns result array with 1 match', () =>
        assert.deepEqual(index.search('barb'), [
          { id: 1, match: 'barb', indices: [ 0 ], score: 100 }
        ])
      )

      test('search returns result array with 1 match not at start of string', () =>
        assert.deepEqual(index.search('arb'), [
          { id: 1, match: 'barb', indices: [ 1 ], score: 75 }
        ])
      )
    })
  })

  suite('addDocument with repetitive text:', () => {
    setup(() =>
      index.addDocument({ _id: 0, foo: 'xfooxfooxfoo' })
    )

    test('search returns result array with 1 match', () =>
      assert.deepEqual(index.search('foo'), [
        { id: 0, match: 'xfooxfooxfoo', indices: [ 1, 5, 9 ], score: 75 }
      ])
    )

    suite('addDocument with similar repetitive text:', () => {
      setup(() =>
        index.addDocument({ _id: 1, foo: 'foodfoodfood' })
      )

      test('search returns results in index order if scores are equal', () =>
        assert.deepEqual(index.search('foo'), [
          { id: 1, match: 'foodfoodfood', indices: [ 0, 4, 8 ], score: 75 },
          { id: 0, match: 'xfooxfooxfoo', indices: [ 1, 5, 9 ], score: 75 }
        ])
      )
    })
  })

  suite('addDocument with whitespace and punctuation:', () => {
    setup(() => {
      index.addDocument({ _id: 0, foo: 'The King & Queen' })
      index.addDocument({ _id: 1, foo: 'The Queen\'s Head' })
      index.addDocument({ _id: 2, foo: 'The King\'s Arms' })
    })

    test('search with punctuation difference returns correct result', () =>
      assert.deepEqual(index.search('QueensHead'), [
        { id: 1, match: 'The Queen\'s Head', indices: [ 4 ], score: 63 },
      ])
    )

    test('search with punctuation match returns correct result', () =>
      assert.deepEqual(index.search('Queen\'s Head'), [
        { id: 1, match: 'The Queen\'s Head', indices: [ 4 ], score: 75 },
      ])
    )

    test('search with wrong order returns empty result', () =>
      assert.deepEqual(index.search('HeaQueen\'s d'), [])
    )
  })
})

