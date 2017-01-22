# surch

[![Package status](https://img.shields.io/npm/v/surch.svg?style=flat-square)](https://www.npmjs.com/package/surch)
[![Build status](https://img.shields.io/travis/philbooth/surch.svg?style=flat-square)](https://travis-ci.org/philbooth/surch)
[![License](https://img.shields.io/github/license/philbooth/surch.svg?style=flat-square)](https://opensource.org/licenses/MIT)

Create and query
searchable document indices
in Node.js.

* [Why would I want to do that?](#why-would-i-want-to-do-that)
* [How does it work?](#how-does-it-work)
* [How do I install it?](#how-do-i-install-it)
* [How do I use it?](#how-do-i-use-it)
  * [Loading the library](#loading-the-library)
  * [Creating an index](#creating-an-index)
  * [Adding documents to an index](#adding-documents-to-an-index)
  * [Searching for matching documents](#searching-for-matching-documents)
  * [Deleting documents from an index](#deleting-documents-from-an-index)
  * [Updating documents in an index](#updating-documents-in-an-index)
  * [Clearing an index](#clearing-an-index)
* [How is punctuation handled?](#how-is-punctuation-handled)
* [Does it understand unicode?](#does-it-understand-unicode)
* [Does it handle object-based document ids?](#does-it-handle-object-based-document-ids)
* [What should I be careful about?](#what-should-i-be-careful-about)
* [Is there a change log?](#is-there-a-change-log)
* [How do I set up the dev environment?](#how-do-i-set-up-the-dev-environment)
* [What license is it released under?](#what-license-is-it-released-under)

## Why would I want to do that?

You probably don't.
Use the index functionality
provided by your database layer
or a proper search engine
instead.

For my part,
I wanted to implement fuzzy search
over a MongoDB instance,
because I'm too lazy
to change my hosting provider
and that's the only database they support.

## How does it work?

When documents are added to the index,
strings are broken down into *n*-grams
(trigrams by default)
to be used as keys
in an inverted index.
When searching,
queries are broken down
in the same way.
This approach has two benefits:

* Matches are fuzzy.
  A single query
  can match completely separate portions
  of an indexed string.

* Queries are fast.
  Each *n*-gram is a key
  into the inverted index,
  so there is no need
  to iterate through
  the characters in every string.

To satisfy
the most common use-case (i.e. mine),
whitespace in each query
is treated as a separator
between subqueries.
Subquery results
are then intersected by document id
to produce the overall result.

## How do I install it?

Via `npm`:

```
npm i surch --save
```

Or if you just want the git repo:

```
git clone git@github.com:philbooth/surch.git
```

## How do I use it?

### Loading the library

Use `require`:

```js
const surch = require('surch');
```

### Creating an index

Call `create(key)`,
where `key` is the name
of the property
you wish to be indexed:

```js
const index = surch.create('foo');
```

`create` also takes
an optional second argument,
which allows different aspects
of the internal behaviour
to be configured:

```js
const index2 = surch.create('bar', {
  idKey,         // The identity key for documents. Defaults to `'_id'`.
  minLength,     // The minimum queryable substring length. Defaults to `3`.
  caseSensitive, // Enables case-sensitive matching. Defaults to `false`.
  strict,        // Enables strict (non-fuzzy) matching. Defaults to `false`.
  coerceId       // Coercion function for object-based ids. Defaults to `id => id`.
});
```

### Adding documents to an index

Call `add(document)`,
where `document` is the object
you want to add to the index:

```js
index.add({
  _id: 'ffox1',
  foo: 'Down in the valley there were three farms.'
});
index.add({
  _id: 'ffox2',
  foo: 'The owners of these farms had done well.'
});
index.add({
  _id: 'ffox3',
  foo: 'They were rich men.'
});
```

### Searching for matching documents

Call `search(query)`,
where query is the string
that you'd like to match against:

```js
index.search('farm');
// Returns [
//   {
//     id: 'ffox2', indices: [ 20 ], score: 10,
//     match: 'The owners of these farms had done well.'
//   },
//   {
//     id: 'ffox1', indices: [ 36 ], score: 10,
//     match: 'Down in the valley there were three farms.'
//   }
// ]

index.search('valley farm');
// Returns [
//   {
//     id: 'ffox1', indices: [ 12, 36 ], score: 26,
//     match: 'Down in the valley there were three farms.'
//   }
// ]
```

The result is an array
of objects that identify
the matched document,
the matching string,
the indices of each matched substring within that string
and a weighting score
indicating the strength of the match
as a whole.

The maximum score is 100
and the array is sorted
in descending score order.
If two results
have the same score,
the match with the lowest index
(i.e. closest to the start of the string)
comes first.

### Deleting documents from an index

Call `delete(id)`,
where `id` identifies the document
that you wish to delete:

```js
index.delete('ffox2');
```

### Updating documents in an index

Call `update(document)`,
where `document` is the updated object:

```js
index.update({
  _id: 'ffox1',
  foo: 'Their names were Farmer Boggis, Farmer Bunce and Farmer Bean.'
});
```

### Clearing an index

Call `clear()`
to delete all documents
from an index:

```js
index.clear();
```

## How is punctuation handled?

Punctuation is ignored.
For instance,
a document containing the string
`'King\'s Cross'`
will be matched
by both of the queries
`'King\'s Cross'` and `'Kings Cross'`.

## Does it understand unicode?

Yes.
Documents are indexed
in their NKFC-normalised form
so lookalikes such as
`'ma\xf1ana'` and `'man\u0303ana'`
are matched identically.

## Does it handle object-based document ids?

Yes.
Object-based document ids
work out-of-the-box,
but you may want to coerce them
to a different type
using the `coerceId` option
to `create`.

Document ids are always compared
using `===`,
so require consistent object references
to be passed to `add`, `update` and `delete`.
The `coerceId` function
is called on entry
to each of these methods
and can be used to ensure
that object-based ids are handled sanely.

For instance,
to coerce MongoDB `ObjectId` references
to strings,
you could do the following:

```js
const index = surch.create('foo', {
  coerceId: id => id.valueOf()
});
index.add({
  _id: new ObjectId('58847582a08c71481a672cc3'),
  foo: 'The quick brown fox jumps over the lazy dog.'
});
```

Note that the `coerceId` option
also affects the `id` property
returned by `search`:

```js
index.search('fox');
// Returns [
//   { id: '58847582a08c71481a672cc3', ... }
// ]
```

## What should I be careful about?

It's entirely your responsibility
to keep the index synchronised
with your data store.
Among other things,
that means you need to handle restarts sanely.
When your application starts,
you need to populate the index
with all of the documents
from your database.
And as you insert, update or delete items,
you need to update the index accordingly.

## Is there a change log?

[Yes](CHANGELOG.md).

## How do I set up the dev environment?

To install the dependencies:

```
npm i
```

To run the tests:

```
npm t
```

To lint the code:

```
npm run lint
```

## What license is it released under?

[MIT](LICENSE).

