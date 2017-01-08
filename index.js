'use strict'

const { assert } = require('check-types')

const INSIGNIFICANT_CHARACTERS = [
  { from: 0, to: 47 },
  { from: 58, to: 64 },
  { from: 91, to: 96 },
  { from: 91, to: 96 },
  { from: 123, to: 191 },
  { from: 215, to: 215 },
  { from: 247, to: 247 }
].reduce((chars, range) => {
  for (let code = range.from; code <= range.to; ++code) {
    chars.add(String.fromCharCode(code))
  }
  return chars
}, new Set())

module.exports = {
  /**
   * Create a searchable document index.
   *
   * @param {String} targetKey
   * The target property key to be indexed for each document.
   *
   * @param {Object} [options]
   * Optional arguments.
   *
   *   @param {String} [options.idKey]
   *   The identity key for each document. Default is '_id'.
   *
   *   @param {String} [options.minLength]
   *   The minimum queryable substring length. Default is 3.
   *
   *   @param {Boolean} [options.caseSensitive]
   *   Indicates whether querying should be case sensitive. Default is false.
   *
   * @returns {Index}
   */
  create (targetKey, { idKey = '_id', minLength = 3, caseSensitive = false } = {}) {
    assert.nonEmptyString(targetKey, 'Invalid argument, "targetKey".')
    assert.nonEmptyString(idKey, 'Invalid option, "idKey".')
    assert.integer(minLength, 'Invalid option, "minLength".')
    assert(minLength > 0, 'Invalid option, "minLength".')
    assert.boolean(caseSensitive, 'Invalid option, "caseSensitive".')

    const FULL_STRINGS = new Map()
    const N_GRAMS = {}

    /**
     * @typedef Index
     * @property {Function} addDocument
     * @property {Function} search
     */
    return {
      /**
       * Add a document to the index.
       *
       * @param {Object} document
       * The document to be added to the index.
       */
      addDocument (document) {
        const value = document[targetKey]
        const documentId = document[idKey]

        if (! value || value.length < minLength) {
          return
        }

        assert.string(value, 'Invalid property.')
        assert.assigned(documentId, 'Invalid document id.')
        assert.equal(FULL_STRINGS.has(documentId), false, 'Duplicate document id.')

        FULL_STRINGS.set(documentId, value)

        const items = []
        split(value, 1, (character, index, position) => {
          items[index] = {
            substring: character,
            index,
            position
          }
        }, (character, index) => {
          items[index].substring += character
        })

        items.forEach(item => {
          const substring = item.substring
          const ngram = N_GRAMS[substring]
          const index = {
            documentId: documentId,
            position: item.position,
            index: item.index
          }

          if (ngram) {
            ngram.push(index)
          } else {
            N_GRAMS[substring] = [ index ]
          }
        })
      },

      /**
       * Search the index for documents matching a query string.
       *
       * @param {String} query
       * The query string.
       *
       * @returns {Array} ids
       * Matching document ids. The most relevant documents will be at the
       * beginning of the array and the least relevant will be at the end.
       */
      search (query) {
        assert.string(query, 'Invalid argument, "query".')
        assert(query.length >= minLength, 'Invalid argument length, "query".')

        const subqueries = []
        split(query, minLength, (character, index) => {
          subqueries[index] = character
        }, (character, index) => {
          subqueries[index] += character
        })

        const dedupedResults = new Map()

        return subqueries
          .reduce((results, subquery, subqueryIndex) => {
            const matches = N_GRAMS[subquery] || []

            if (subqueryIndex === 0) {
              return matches
            }

            return results
              .filter(result => {
                return matches.some(match => {
                  return match.documentId === result.documentId &&
                    match.index === result.index + (subqueryIndex * minLength)
                })
              })
          }, [])
          .reduce((deduped, result) => {
            const { documentId, index, position } = result
            const match = FULL_STRINGS.get(documentId)
            const score = Math.round(query.length / match.length * 100)

            if (dedupedResults.has(documentId)) {
              const canonicalResult = deduped[dedupedResults.get(documentId)]
              canonicalResult.indices.push(position)
              canonicalResult.score += score
            } else {
              dedupedResults.set(documentId, deduped.length)
              deduped.push({
                id: documentId,
                indices: [ position ],
                match,
                score
              })
            }

            return deduped
          }, [])
          .sort((lhs, rhs) => {
            if (lhs.score === rhs.score) {
              return lhs.indices[0] - rhs.indices[0]
            }

            return rhs.score - lhs.score
          })
      }
    }

    function split (string, outerIncrement, outerAssign, innerAssign) {
      const stringLength = string.length

      let i = 0, outerSkipCount = 0

      while (i + outerSkipCount < stringLength) {
        const index = i / outerIncrement
        const position = i + outerSkipCount
        let character = normalise(string[position])

        if (INSIGNIFICANT_CHARACTERS.has(character)) {
          ++outerSkipCount
          continue
        }

        outerAssign(character, index, position)

        let j = 1, innerSkipCount = 0
        while (j < minLength && position + j + innerSkipCount < stringLength) {
          character = normalise(string[position + j + innerSkipCount])

          if (INSIGNIFICANT_CHARACTERS.has(character)) {
            ++innerSkipCount
            if (outerIncrement > 1) {
              ++outerSkipCount
            }
            continue
          }

          innerAssign(character, index)

          ++j
        }

        i += outerIncrement
      }
    }

    function normalise (string) {
      if (caseSensitive) {
        return string
      }

      return string.toLowerCase()
    }
  }
}

