import 'unfetch/polyfill'
function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import mitt from 'mitt';
import { graphqlFetchOptions } from './graphqlFetchOptions';
import { hashObject } from './hashObject';
/**
 * A lightweight GraphQL client that caches queries and mutations.
 * @kind class
 * @name GraphQL
 * @param {object} [options={}] Options.
 * @param {GraphQLCache} [options.cache={}] Cache to import; usually from a server side render.
 * @see [`reportCacheErrors`]{@link reportCacheErrors} to setup error reporting.
 * @example <caption>Construct a GraphQL client.</caption>
 * ```js
 * import { GraphQL } from 'graphql-react'
 *
 * const graphql = new GraphQL()
 * ```
 */

export class GraphQL {
  // eslint-disable-next-line require-jsdoc
  constructor({
    cache = {}
  } = {}) {
    _defineProperty(this, "reload", exceptCacheKey => {
      this.emit('reload', {
        exceptCacheKey
      });
    });

    _defineProperty(this, "reset", exceptCacheKey => {
      let cacheKeys = Object.keys(this.cache);
      if (exceptCacheKey) cacheKeys = cacheKeys.filter(hash => hash !== exceptCacheKey);
      cacheKeys.forEach(cacheKey => delete this.cache[cacheKey]); // Emit cache updates after the entire cache has been updated, so logic in
      // listeners can assume cache for all queries is fresh and stable.

      this.emit('reset', {
        exceptCacheKey
      });
    });

    _defineProperty(this, "fetch", ({
      url,
      ...options
    }, cacheKey) => {
      let fetchResponse;
      const fetcher = typeof fetch === 'function' ? fetch : () => Promise.reject(new Error('Global fetch API or polyfill unavailable.'));
      const cacheValue = {};
      const cacheValuePromise = fetcher(url, options).then(response => {
        fetchResponse = response;
        if (!response.ok) cacheValue.httpError = {
          status: response.status,
          statusText: response.statusText
        };
        return response.json().then(({
          errors,
          data
        }) => {
          // JSON parse ok.
          if (!errors && !data) cacheValue.parseError = 'Malformed payload.';
          if (errors){
            throw new Error(JSON.stringify(errors))
            cacheValue.graphQLErrors = errors;
          } 
          if (data) cacheValue.data = data;

        }, ({
          message
        }) => {
          // JSON parse error.
          cacheValue.parseError = message;
        });
      }, ({
        message
      }) => {
        cacheValue.fetchError = message;
      }).then(() => {
        // Cache the operation.
        this.cache[cacheKey] = cacheValue; // Clear the loaded operation.

        delete this.operations[cacheKey];
        this.emit('cache', {
          cacheKey,
          cacheValue,
          // May be undefined if there was a fetch error.
          response: fetchResponse
        });
        return cacheValue;
      });
      this.operations[cacheKey] = cacheValuePromise;
      this.emit('fetch', {
        cacheKey,
        cacheValuePromise
      });
      return cacheValuePromise;
    });

    _defineProperty(this, "operate", ({
      operation,
      fetchOptionsOverride,
      reloadOnLoad,
      resetOnLoad
    }) => {
      if (reloadOnLoad && resetOnLoad) throw new Error('operate() options “reloadOnLoad” and “resetOnLoad” can’t both be true.');
      const fetchOptions = graphqlFetchOptions(operation);
      if (fetchOptionsOverride) fetchOptionsOverride(fetchOptions);
      const cacheKey = hashObject(fetchOptions);
      const cacheValuePromise = // Use an identical existing request or…
      this.operations[cacheKey] || // …make a fresh request.
      this.fetch(fetchOptions, cacheKey); // Potential edge-case issue: Multiple identical queries with resetOnLoad
      // enabled will cause excessive resets.

      cacheValuePromise.then(() => {
        if (reloadOnLoad) this.reload(cacheKey);else if (resetOnLoad) this.reset(cacheKey);
      });
      return {
        cacheKey,
        cacheValue: this.cache[cacheKey],
        cacheValuePromise
      };
    });

    const {
      on,
      off,
      emit
    } = mitt();
    /**
     * Adds an event listener.
     * @kind function
     * @name GraphQL#on
     * @param {string} type Event type.
     * @param {Function} handler Event handler.
     * @see [`reportCacheErrors`]{@link reportCacheErrors} can be used with this to setup error reporting.
     */

    this.on = on;
    /**
     * Removes an event listener.
     * @kind function
     * @name GraphQL#off
     * @param {string} type Event type.
     * @param {Function} handler Event handler.
     */

    this.off = off;
    /**
     * Emits an event with details to listeners.
     * @param {string} type Event type.
     * @param {*} [details] Event details.
     * @ignore
     */

    this.emit = emit;
    /**
     * Cache of loaded GraphQL operations. You probably don’t need to interact
     * with this unless you’re implementing a server side rendering framework.
     * @kind member
     * @name GraphQL#cache
     * @type {GraphQLCache}
     * @example <caption>Export cache as JSON.</caption>
     * ```js
     * const exportedCache = JSON.stringify(graphql.cache)
     * ```
     * @example <caption>Example cache JSON.</caption>
     * ```json
     * {
     *   "a1bCd2": {
     *      "data": {
     *        "viewer": {
     *          "name": "Jayden Seric"
     *        }
     *      }
     *   }
     * }
     * ```
     */

    this.cache = cache;
    /**
     * A map of loading GraphQL operations. You probably don’t need to interact
     * with this unless you’re implementing a server side rendering framework.
     * @kind member
     * @name GraphQL#operations
     * @type {object.<GraphQLCacheKey, Promise<GraphQLCacheValue>>}
     */

    this.operations = {};
  }
  /**
   * Signals that [GraphQL cache]{@link GraphQL#cache} subscribers such as the
   * [`useGraphQL`]{@link useGraphQL} React hook should reload their GraphQL
   * operation. Emits a [`GraphQL`]{@link GraphQL} instance `reload` event.
   * @kind function
   * @name GraphQL#reload
   * @param {GraphQLCacheKey} [exceptCacheKey] A [GraphQL cache]{@link GraphQL#cache} [key]{@link GraphQLCacheKey} for cache to exempt from reloading.
   * @example <caption>Reloading the [GraphQL cache]{@link GraphQL#cache}.</caption>
   * ```js
   * graphql.reload()
   * ```
   */


}