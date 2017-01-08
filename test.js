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

test('create throws with invalid caseSensitive', () =>
  assert.throws(() => surch.create('foo', { caseSensitive: 1 }))
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

  test('addDocument does not throw with extra value', () =>
    assert.doesNotThrow(() => index.addDocument({ _id: 0, foo: 'bar', baz: 'qux' }))
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
      index.addDocument({ _id: 0, foo: 'bar', baz: 'qux' })
    )

    test('addDocument throws with duplicate id', () =>
      assert.throws(() => index.addDocument({ _id: 0, foo: 'bar' }))
    )

    test('search with 1 match returns correct result', () =>
      assert.deepEqual(index.search('bar'), [
        { id: 0, match: 'bar', indices: [ 0 ], score: 100 }
      ])
    )

    test('search for wrong property returns empty result', () =>
      assert.deepEqual(index.search('qux'), [])
    )

    suite('addDocument with overlapping length property:', () => {
      setup(() =>
        index.addDocument({ _id: 1, foo: 'barb' })
      )

      test('search with 2 matches returns correct result', () =>
        assert.deepEqual(index.search('bar'), [
          { id: 0, match: 'bar', indices: [ 0 ], score: 100 },
          { id: 1, match: 'barb', indices: [ 0 ], score: 75 }
        ])
      )

      test('search with 1 match returns correct result', () =>
        assert.deepEqual(index.search('barb'), [
          { id: 1, match: 'barb', indices: [ 0 ], score: 100 }
        ])
      )

      test('search with 1 match not at start of string returns correct result', () =>
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

    test('search with punctuation match returns correct result', () =>
      assert.deepEqual(index.search('Queen\'s Head'), [
        { id: 1, match: 'The Queen\'s Head', indices: [ 4 ], score: 75 }
      ])
    )

    test('search with punctuation difference returns correct result', () =>
      assert.deepEqual(index.search('QueensHead'), [
        { id: 1, match: 'The Queen\'s Head', indices: [ 4 ], score: 63 }
      ])
    )

    test('search with wrong order returns empty result', () =>
      assert.deepEqual(index.search('HeaQueen\'s d'), [])
    )

    test('search with wrong case returns correct result', () =>
      assert.deepEqual(index.search('Queen\'s head'), [
        { id: 1, match: 'The Queen\'s Head', indices: [ 4 ], score: 75 }
      ])
    )
  })

  suite('addDocument with same word in different cases:', () => {
    setup(() =>
      index.addDocument({ _id: 0, foo: 'The quick brown fox jumps over the lazy dog.' })
    )

    test('search with one case returns indices and score for both cases', () =>
      assert.deepEqual(index.search('the'), [
        { id: 0, match: 'The quick brown fox jumps over the lazy dog.', indices: [ 0, 31 ], score: 14 }
      ])
    )

    suite('addDocument with subset of the same string:', () => {
      setup(() =>
        index.addDocument({ _id: 1, foo: 'The quick brown fox jumps over the dog.' })
      )

      test('search with common substring returns results in score order', () =>
        assert.deepEqual(index.search('the'), [
          { id: 1, match: 'The quick brown fox jumps over the dog.', indices: [ 0, 31 ], score: 16 },
          { id: 0, match: 'The quick brown fox jumps over the lazy dog.', indices: [ 0, 31 ], score: 14 }
        ])
      )
    })
  })
})

suite('create with different idKey:', () => {
  let index

  setup(() => {
    index = surch.create('foo', { idKey: 'bar' })
    index.addDocument({ bar: 'baz', foo: 'The quick brown fox jumps over the lazy dog.' })
  })

  test('search with 1 match returns correct result', () =>
    assert.deepEqual(index.search('the'), [
      { id: 'baz', match: 'The quick brown fox jumps over the lazy dog.', indices: [ 0, 31 ], score: 14 }
    ])
  )
})

suite('create with minLength=4:', () => {
  let index

  setup(() => {
    index = surch.create('foo', { minLength: 4 })
    index.addDocument({ _id: 0, foo: 'The quick brown fox jumps over the lazy dog.' })
  })

  test('search throws with short query', () =>
    assert.throws(() => index.search('the'))
  )

  test('search with 1 match returns correct result', () =>
    assert.deepEqual(index.search('the l'), [
      { id: 0, match: 'The quick brown fox jumps over the lazy dog.', indices: [ 31 ], score: 11 }
    ])
  )
})

suite('create with caseSensitive=true:', () => {
  let index

  setup(() => {
    index = surch.create('wibble', { caseSensitive: true })
    index.addDocument({ _id: 0, wibble: 'The quick brown fox jumps over the lazy dog.' })
  })

  test('search with wrong case returns empty result', () =>
    assert.deepEqual(index.search('thE'), [])
  )

  test('search with one case returns indices and score for the correct case', () =>
    assert.deepEqual(index.search('the'), [
      { id: 0, match: 'The quick brown fox jumps over the lazy dog.', indices: [ 31 ], score: 7 }
    ])
  )
})

