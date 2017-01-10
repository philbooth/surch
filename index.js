'use strict'

const { assert } = require('check-types')

const INSIGNIFICANT_CHARACTERS = [
  { from: 0, to: 47 },
  { from: 58, to: 64 },
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
    const N_GRAMS = new Map()

    /**
     * @typedef Index
     * @property {Function} add
     * @property {Function} delete
     * @property {Function} update
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
          const ngram = N_GRAMS.get(substring)
          const index = {
            documentId,
            position: item.position,
            index: item.index
          }

          if (ngram) {
            ngram.push(index)
          } else {
            N_GRAMS.set(substring, [ index ])
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

        N_GRAMS.forEach((indices, key) => {
          indices = indices.filter(index => index.documentId !== documentId)
          if (indices.length === 0) {
            N_GRAMS.delete(key)
          } else {
            N_GRAMS.set(key, indices)
          }
        })
      },

      /**
       * Update a document in the index.
       *
       * @param {Object} document
       * The document to be updated.
       */
      update (document) {
        this.delete(document[idKey])
        this.add(document)
      },

      /**
       * Search the index for documents matching a query string.
       *
       * @param {String} query
       * The query string.
       *
       * @returns {Array} results
       * Matching documents. The most relevant documents will be at the
       * beginning of the array and the least relevant will be at the end.
       */
      search (query) {
        assert.string(query, 'Invalid argument, "query".')
        assert(query.length >= minLength, 'Invalid argument length, "query".')

        return filter(split(query))
          .reduce(dedupe.bind(new Map(), query), [])
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
        position,
        tokenStart: ! strict && WHITESPACE.has(string[position - 1])
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

    function filter (subqueries, documentId = null, results = []) {
      let candidates

      for (let i = 0; subqueries.length > 0; ++i) {
        const subquery = subqueries[0]
        const matches = N_GRAMS.get(subquery.substring) || []

        if (i === 0) {
          if (documentId) {
            candidates = matches.filter(match => match.documentId === documentId)
          } else {
            candidates = matches
          }

          subqueries.shift()
          continue
        }

        if (candidates.length === 0) {
          return []
        }

        if (subquery.tokenStart) {
          return filter(subqueries, candidates[0].documentId, results.concat(candidates))
        }

        candidates = candidates.filter(candidate => {
          return matches.some(match => {
            return match.documentId === candidate.documentId && match.index === candidate.index + i
          })
        })

        subqueries.shift()
      }

      return results.concat(candidates)
    }

    function dedupe (query, deduped, result) {
      const ids = this
      const { documentId, position } = result
      const match = FULL_STRINGS.get(documentId)
      const score = Math.round(query.length / match.length * 100)

      if (ids.has(documentId)) {
        const canonicalResult = deduped[ids.get(documentId)]
        canonicalResult.indices.push(position)
        if (strict) {
          canonicalResult.score += score
        }
      } else {
        ids.set(documentId, deduped.length)
        deduped.push({
          id: documentId,
          indices: [ position ],
          match,
          score
        })
      }

      return deduped
    }
  }
}

