/* eslint-disable no-shadow, max-nested-callbacks */
/* eslint-env mocha */

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

test('create throws with invalid strict', () =>
  assert.throws(() => surch.create('foo', { strict: 'true' }))
)

test('create throws with non-function coerceId', () =>
  assert.throws(() => surch.create('foo', { coerceId: { length: 1 } }))
)

test('create throws with invalid coerceId', () =>
  assert.throws(() => surch.create('foo', { coerceId () {} }))
)

suite('create with default arguments:', () => {
  let index

  setup(() =>
    index = surch.create('foo')
  )

  test('index has 5 properties', () =>
    assert.lengthOf(Object.keys(index), 5)
  )

  test('index has add method', () =>
    assert.isFunction(index.add)
  )

  test('add expects 1 argument', () =>
    assert.lengthOf(index.add, 1)
  )

  test('index has delete method', () =>
    assert.isFunction(index.delete)
  )

  test('delete expects 1 argument', () =>
    assert.lengthOf(index.delete, 1)
  )

  test('index has update method', () =>
    assert.isFunction(index.update)
  )

  test('update expects 1 argument', () =>
    assert.lengthOf(index.update, 1)
  )

  test('index has clear method', () =>
    assert.isFunction(index.clear)
  )

  test('clear expects no arguments', () =>
    assert.lengthOf(index.clear, 0)
  )

  test('index has search method', () =>
    assert.isFunction(index.search)
  )

  test('search expects 1 argument', () =>
    assert.lengthOf(index.search, 1)
  )

  test('add throws with invalid property', () =>
    assert.throws(() => index.add({ _id: 0, foo: {} }))
  )

  test('add throws with missing id', () =>
    assert.throws(() => index.add({ _id: null, foo: 'bar' }))
  )

  test('add does not throw with missing value', () =>
    assert.doesNotThrow(() => index.add({ _id: 0 }))
  )

  test('add does not throw with short value', () =>
    assert.doesNotThrow(() => index.add({ _id: 0, foo: 'ba' }))
  )

  test('add does not throw with extra value', () =>
    assert.doesNotThrow(() => index.add({ _id: 0, foo: 'bar', baz: 'qux' }))
  )

  test('delete throws with invalid documentId', () =>
    assert.throws(() => index.delete(42))
  )

  test('update throws with invalid documentId', () =>
    assert.throws(() => {
      index.update({ _id: 42, foo: 'bar' })
    })
  )

  test('update throws with invalid property', () =>
    assert.throws(() => {
      index.add({ _id: 42, foo: 'bar' })
      index.update({ _id: 42, foo: {} })
    })
  )

  test('update does not throw with missing value', () =>
    assert.doesNotThrow(() => {
      index.add({ _id: 42, foo: 'bar' })
      index.update({ _id: 42 })
    })
  )

  test('update does not throw with short value', () =>
    assert.doesNotThrow(() => {
      index.add({ _id: 42, foo: 'bar' })
      index.update({ _id: 42, foo: 'ba' })
    })
  )

  test('update does not throw with extra value', () =>
    assert.doesNotThrow(() => {
      index.add({ _id: 42, foo: 'bar' })
      index.update({ _id: 42, foo: 'bar', baz: 'qux' })
    })
  )

  test('clear does not throw', () =>
    assert.doesNotThrow(() => index.clear())
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

  suite('add with minimum length property:', () => {
    setup(() =>
      index.add({ _id: 0, foo: 'bar', baz: 'qux' })
    )

    test('add throws with duplicate id', () =>
      assert.throws(() => index.add({ _id: 0, foo: 'bar' }))
    )

    test('search with 1 match returns correct result', () =>
      assert.deepEqual(index.search('bar'), [
        { id: 0, match: 'bar', indices: [ 0 ], score: 100 }
      ])
    )

    test('search for wrong property returns empty result', () =>
      assert.deepEqual(index.search('qux'), [])
    )

    suite('add with similar property:', () => {
      setup(() =>
        index.add({ _id: 1, foo: 'barb' })
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

      suite('delete:', () => {
        setup(() =>
          index.delete(1)
        )

        test('search with former match returns empty result', () =>
          assert.deepEqual(index.search('barb'), [])
        )

        test('search with remaining match returns correct result', () =>
          assert.deepEqual(index.search('bar'), [
            { id: 0, match: 'bar', indices: [ 0 ], score: 100 }
          ])
        )
      })

      suite('update:', () => {
        setup(() =>
          index.update({ _id: 1, foo: 'wibble' })
        )

        test('search with former match returns empty result', () =>
          assert.deepEqual(index.search('barb'), [])
        )

        test('search with remaining match returns correct result', () =>
          assert.deepEqual(index.search('bar'), [
            { id: 0, match: 'bar', indices: [ 0 ], score: 100 }
          ])
        )

        test('search with new match returns correct result', () =>
          assert.deepEqual(index.search('ibb'), [
            { id: 1, match: 'wibble', indices: [ 1 ], score: 50 }
          ])
        )
      })

      suite('clear:', () => {
        setup(() =>
          index.clear()
        )

        test('search with former match returns empty result', () =>
          assert.deepEqual(index.search('bar'), [])
        )

        test('search with other former match returns empty result', () =>
          assert.deepEqual(index.search('barb'), [])
        )
      })
    })
  })

  suite('add with repetitive text:', () => {
    setup(() =>
      index.add({ _id: 0, foo: 'xfooxfooxfoo' })
    )

    test('search returns result array with 1 match', () =>
      assert.deepEqual(index.search('foo'), [
        { id: 0, match: 'xfooxfooxfoo', indices: [ 1, 5, 9 ], score: 25 }
      ])
    )

    suite('add with similar repetitive text:', () => {
      setup(() =>
        index.add({ _id: 1, foo: 'foodfoodfood' })
      )

      test('search returns results in index order if scores are equal', () =>
        assert.deepEqual(index.search('foo'), [
          { id: 1, match: 'foodfoodfood', indices: [ 0, 4, 8 ], score: 25 },
          { id: 0, match: 'xfooxfooxfoo', indices: [ 1, 5, 9 ], score: 25 }
        ])
      )
    })
  })

  suite('add with whitespace and punctuation:', () => {
    setup(() => {
      index.add({ _id: 0, foo: 'The King & Queen' })
      index.add({ _id: 1, foo: 'The Queen\'s Head' })
      index.add({ _id: 2, foo: 'The King\'s Arms' })
    })

    test('search with punctuation match returns correct result', () =>
      assert.deepEqual(index.search('Queen\'s Head'), [
        { id: 1, match: 'The Queen\'s Head', indices: [ 4, 12 ], score: 75 }
      ])
    )

    test('search with punctuation difference returns correct result', () =>
      assert.deepEqual(index.search('Queens Head'), [
        { id: 1, match: 'The Queen\'s Head', indices: [ 4, 12 ], score: 69 }
      ])
    )

    test('search with wrong order returns empty result', () =>
      assert.deepEqual(index.search('en\'sQue Head'), [])
    )

    test('search with wrong case returns correct result', () =>
      assert.deepEqual(index.search('Queen\'s head'), [
        { id: 1, match: 'The Queen\'s Head', indices: [ 4, 12 ], score: 75 }
      ])
    )

    test('search with missing whitespace returns empty result', () =>
      assert.deepEqual(index.search('QueensHead'), [])
    )

    test('search with partial matches returns correct result', () =>
      assert.deepEqual(index.search('en\'s ead'), [
        { id: 1, match: 'The Queen\'s Head', indices: [ 7, 13 ], score: 50 }
      ])
    )
  })

  suite('add with same word in different cases:', () => {
    setup(() =>
      index.add({ _id: 0, foo: 'The quick brown fox jumps over the lazy dog.' })
    )

    test('search with one case returns indices for both cases', () =>
      assert.deepEqual(index.search('the'), [
        { id: 0, match: 'The quick brown fox jumps over the lazy dog.', indices: [ 0, 31 ], score: 7 }
      ])
    )

    suite('add with subset of the same string:', () => {
      setup(() =>
        index.add({ _id: 1, foo: 'The quick brown fox jumps over the dog.' })
      )

      test('search with common substring returns results in score order', () =>
        assert.deepEqual(index.search('the'), [
          { id: 1, match: 'The quick brown fox jumps over the dog.', indices: [ 0, 31 ], score: 8 },
          { id: 0, match: 'The quick brown fox jumps over the lazy dog.', indices: [ 0, 31 ], score: 7 }
        ])
      )
    })
  })
})

suite('create with different idKey:', () => {
  let index

  setup(() => {
    index = surch.create('foo', { idKey: 'bar' })
    index.add({ bar: 'baz', foo: 'The quick brown fox jumps over the lazy dog.' })
  })

  test('search with 1 match returns correct result', () =>
    assert.deepEqual(index.search('the'), [
      { id: 'baz', match: 'The quick brown fox jumps over the lazy dog.', indices: [ 0, 31 ], score: 7 }
    ])
  )
})

suite('create with minLength=4:', () => {
  let index

  setup(() => {
    index = surch.create('foo', { minLength: 4 })
    index.add({ _id: 0, foo: 'The quick brown fox jumps over the lazy dog.' })
  })

  test('search throws with short query', () =>
    assert.throws(() => index.search('the'))
  )

  test('search with 1 match returns correct result', () =>
    assert.deepEqual(index.search('lazy'), [
      { id: 0, match: 'The quick brown fox jumps over the lazy dog.', indices: [ 35 ], score: 9 }
    ])
  )
})

suite('create with caseSensitive=true:', () => {
  let index

  setup(() => {
    index = surch.create('wibble', { caseSensitive: true })
    index.add({ _id: 0, wibble: 'The quick brown fox jumps over the lazy dog.' })
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

suite('create with strict=true:', () => {
  let index

  setup(() => {
    index = surch.create('wibble', { strict: true })
    index.add({ _id: 0, wibble: 'The King & Queen' })
    index.add({ _id: 1, wibble: 'The Queen\'s Head' })
    index.add({ _id: 2, wibble: 'The King\'s Arms' })
  })

  test('search with punctuation match returns correct result', () =>
    assert.deepEqual(index.search('g\'s A'), [
      { id: 2, match: 'The King\'s Arms', indices: [ 7 ], score: 33 }
    ])
  )

  test('search with punctuation difference returns correct result', () =>
    assert.deepEqual(index.search('gsA'), [
      { id: 2, match: 'The King\'s Arms', indices: [ 7 ], score: 20 }
    ])
  )

  test('search with wrong case returns correct result', () =>
    assert.deepEqual(index.search('nsh'), [
      { id: 1, match: 'The Queen\'s Head', indices: [ 8 ], score: 19 }
    ])
  )

  test('search with wrong order returns empty result', () =>
    assert.deepEqual(index.search('HeaQueen\'s d'), [])
  )
})

suite('create with strict=true, minLength=4:', () => {
  let index

  setup(() => {
    index = surch.create('foo', { strict: true, minLength: 4 })
    index.add({ _id: 0, foo: 'The quick brown fox jumps over the lazy dog.' })
  })

  test('search with whitespace-separated match returns correct result', () =>
    assert.deepEqual(index.search('the l'), [
      { id: 0, match: 'The quick brown fox jumps over the lazy dog.', indices: [ 31 ], score: 11 }
    ])
  )
})

suite('readme:', () => {
  let index

  setup(() => {
    index = surch.create('foo')
    index.add({ _id: 'ffox1', foo: 'Down in the valley there were three farms.' })
    index.add({ _id: 'ffox2', foo: 'The owners of these farms had done well.' })
    index.add({ _id: 'ffox3', foo: 'They were rich men.' })
  })

  test('search with 2 matches returns correct results', () =>
    assert.deepEqual(index.search('farm'), [
      { id: 'ffox2', match: 'The owners of these farms had done well.', indices: [ 20 ], score: 10 },
      { id: 'ffox1', match: 'Down in the valley there were three farms.', indices: [ 36 ], score: 10 }
    ])
  )

  test('search with 1 match returns correct result', () =>
    assert.deepEqual(index.search('valle far'), [
      { id: 'ffox1', match: 'Down in the valley there were three farms.', indices: [ 12, 36 ], score: 21 }
    ])
  )
})

suite('unicode high-order bytes:', () => {
  let index

  setup(() => {
    index = surch.create('foo')
    index.add({ _id: 'bar', foo: '💩💰💥 🔥😞😀' })
    index.add({ _id: 'baz', foo: '💩💰💥 🔥😞🙀' })
  })

  test('search with 2 matches returns correct results', () =>
    assert.deepEqual(index.search('💩💰💥'), [
      { id: 'bar', match: '💩💰💥 🔥😞😀', indices: [ 0 ], score: 43 },
      { id: 'baz', match: '💩💰💥 🔥😞🙀', indices: [ 0 ], score: 43 }
    ])
  )

  test('search with 1 match returns correct result', () =>
    assert.deepEqual(index.search('🔥😞😀'), [
      { id: 'bar', match: '💩💰💥 🔥😞😀', indices: [ 4 ], score: 43 }
    ])
  )

  test('search with no matches returns empty result', () =>
    assert.deepEqual(index.search('🔥😞🚀'), [])
  )

  test('search throws with short query', () =>
    assert.throws(() => index.search('🔥😞'))
  )
})

suite('unicode lookalikes:', () => {
  let index

  setup(() => {
    index = surch.create('foo')
    index.add({ _id: 'bar', foo: 'ma\xf1ana' })
    index.add({ _id: 'baz', foo: 'man\u0303ana' })
  })

  test('search with normalised query returns correct results', () =>
    assert.deepEqual(index.search('ma\xf1ana'), [
      { id: 'bar', match: 'ma\xf1ana', indices: [ 0 ], score: 100 },
      { id: 'baz', match: 'man\u0303ana', indices: [ 0 ], score: 100 }
    ])
  )

  test('search with unnormalised query returns correct results', () =>
    assert.deepEqual(index.search('man\u0303ana'), [
      { id: 'bar', match: 'ma\xf1ana', indices: [ 0 ], score: 100 },
      { id: 'baz', match: 'man\u0303ana', indices: [ 0 ], score: 100 }
    ])
  )
})

suite('id coercion:', () => {
  let index

  setup(() => {
    index = surch.create('foo', { coerceId: id => id.str })
    index.add({ _id: { str: 'bar' }, foo: 'qux' })
    index.add({ _id: { str: 'baz' }, foo: 'qux' })
  })

  test('add throws with duplicate coerced id', () =>
    assert.throws(() => index.add({ _id: { str: 'bar' }, foo: 'wibble' }))
  )

  test('update recognises coerced id', () => {
    assert.deepEqual(index.search('qux'), [
      { id: 'bar', match: 'qux', indices: [ 0 ], score: 100 },
      { id: 'baz', match: 'qux', indices: [ 0 ], score: 100 }
    ])
    index.update({ _id: { str: 'bar' }, foo: 'wibble' })
    assert.deepEqual(index.search('qux'), [
      { id: 'baz', match: 'qux', indices: [ 0 ], score: 100 }
    ])
  })

  test('delete recognises coerced id', () => {
    assert.deepEqual(index.search('qux'), [
      { id: 'bar', match: 'qux', indices: [ 0 ], score: 100 },
      { id: 'baz', match: 'qux', indices: [ 0 ], score: 100 }
    ])
    index.delete({ str: 'baz' })
    assert.deepEqual(index.search('qux'), [
      { id: 'bar', match: 'qux', indices: [ 0 ], score: 100 }
    ])
  })
})

suite('https://github.com/philbooth/surch/issues/1:', () => {
  let index

  setup(() => {
    index = surch.create('foo')
    index.add({ _id: '01', foo: 'The Queen\'s Head' })
    index.add({ _id: '02', foo: 'The Craft Beer Co.' })
    index.add({ _id: '03', foo: 'The Three Johns' })
  })

  test('search returns correct results', () => {
    assert.deepEqual(index.search('The Craft Beer Co.'), [
      { id: '02', match: 'The Craft Beer Co.', indices: [ 0, 4, 10 ], score: 100 }
    ])
    assert.deepEqual(index.search('The Three Johns'), [
      { id: '03', match: 'The Three Johns', indices: [ 0, 4, 10 ], score: 100 }
    ])
  })
})

suite('https://github.com/philbooth/surch/issues/2:', () => {
  let index

  setup(() => {
    index = surch.create('foo')
    index.add({ _id: '01', foo: 'bar baz' })
    index.add({ _id: '02', foo: 'bar baz' })
  })

  test('search returns correct results', () =>
    assert.deepEqual(index.search('bar baz'), [
      { id: '01', match: 'bar baz', indices: [ 0, 4 ], score: 100 },
      { id: '02', match: 'bar baz', indices: [ 0, 4 ], score: 100 }
    ])
  )
})

suite('https://github.com/philbooth/surch/issues/3:', () => {
  let index

  setup(() => {
    index = surch.create('foo')
    index.add({ _id: '01', foo: 'foo bara' })
    index.add({ _id: '02', foo: 'foo barb' })
  })

  test('search returns correct results', () => {
    assert.deepEqual(index.search('foo'), [
      { id: '01', match: 'foo bara', indices: [ 0 ], score: 38 },
      { id: '02', match: 'foo barb', indices: [ 0 ], score: 38 }
    ])
    assert.deepEqual(index.search('foo bara'), [
      { id: '01', match: 'foo bara', indices: [ 0, 4 ], score: 100 }
    ])
    assert.deepEqual(index.search('foo barb'), [
      { id: '02', match: 'foo barb', indices: [ 0, 4 ], score: 100 }
    ])
  })
})

