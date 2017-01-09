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

const WHITESPACE = new Set([ ' ', '\u00a0', '\t', '\v', '\f', '\r', '\n' ])

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
   *   Indicates whether queries should be case sensitive. Default is false.
   *
   *   @param {Boolean} [options.strict]
   *   Indicates whether queries should be strictly matched. Default is false.
   *
   * @returns {Index}
   */
  create (targetKey, { idKey = '_id', minLength = 3, caseSensitive = false, strict = false } = {}) {
    assert.nonEmptyString(targetKey, 'Invalid argument, "targetKey".')
    assert.nonEmptyString(idKey, 'Invalid option, "idKey".')
    assert.integer(minLength, 'Invalid option, "minLength".')
    assert(minLength > 0, 'Invalid option, "minLength".')
    assert.boolean(caseSensitive, 'Invalid option, "caseSensitive".')
    assert.boolean(strict, 'Invalid option, "strict".')

    const FULL_STRINGS = new Map()
    const N_GRAMS = {}

    /**
     * @typedef Index
     * @property {Function} add
     * @property {Function} delete
     * @property {Function} search
     */
    return {
      /**
       * Add a document to the index.
       *
       * @param {Object} document
       * The document to be added to the index.
       */
      add (document) {
        const value = document[targetKey]
        const documentId = document[idKey]

        if (! value || value.length < minLength) {
          return
        }

        assert.string(value, 'Invalid property.')
        assert.assigned(documentId, 'Invalid document id.')
        assert.equal(FULL_STRINGS.has(documentId), false, 'Duplicate document id.')

        FULL_STRINGS.set(documentId, value)

        split(value).forEach(item => {
          const substring = item.substring
          const ngram = N_GRAMS[substring]
          const index = {
            documentId,
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
       * Delete a document from the index.
       *
       * @param documentId
       * Id of the document to be removed from the index.
       */
      delete (documentId) {
        assert.string(FULL_STRINGS.get(documentId), 'Invalid document id.')

        FULL_STRINGS.delete(documentId)

        Object.entries(N_GRAMS).forEach(([ key, indices ]) => {
          N_GRAMS[key] = indices.filter(index => index.documentId !== documentId)
          if (N_GRAMS[key].length === 0) {
            delete N_GRAMS[key]
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

        const dedupedResults = new Map()

        return split(query)
          .reduce((results, subquery, subqueryIndex) => {
            const matches = N_GRAMS[subquery.substring] || []

            if (subqueryIndex === 0) {
              return matches
            }

            return results
              .filter(result => {
                return matches.some(match => {
                  return match.documentId === result.documentId && match.index === result.index + subqueryIndex
                })
              })
          }, [])
          .reduce((deduped, result) => {
            const { documentId, position } = result
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

    function split (string, index = 0, skipCount = 0, substrings = []) {
      const stringLength = string.length

      if (index + skipCount > stringLength - minLength) {
        return substrings
      }

      const position = index + skipCount
      let character = normalise(string[position])

      if (INSIGNIFICANT_CHARACTERS.has(character)) {
        return split(string, index, skipCount + 1, substrings)
      }

      substrings[index] = {
        substring: character,
        index,
        position
      }

      let j = 1, substringSkipCount = 0
      while (j < minLength) {
        if (position + j + substringSkipCount < stringLength) {
          character = normalise(string[position + j + substringSkipCount])

          if (strict || ! WHITESPACE.has(character)) {
            if (INSIGNIFICANT_CHARACTERS.has(character)) {
              ++substringSkipCount
              continue
            }

            substrings[index].substring += character
            ++j
            continue
          }
        }

        substrings.pop()
        return split(string, index, skipCount + 1, substrings)
      }

      return split(string, index + 1, skipCount, substrings)
    }

    function normalise (string) {
      if (caseSensitive || ! string) {
        return string
      }

      return string.toLowerCase()
    }
  }
}

