/* eslint-disable no-console */
import fetch from 'node-fetch';
import _ from 'lodash';
import { GraphQLError } from 'graphql';
import queryString from 'query-string';


    function resolve(obj, args, context,
                     caption, path, linkFromField, linkToField, skeleton) {
      const { cql, offset, limit } = args;
      const { okapi } = context;

      const query = {};
      if (cql) query.query = cql;
      if (offset) query.offset = offset;
      if (limit) query.limit = limit;
      if (linkFromField) query.query = `${linkToField}=="${obj[linkFromField]}"`;
      const search = queryString.stringify(query);
      const url = `${okapi.url}/${path}${search ? `?${search}` : ''}`;
      console.log(`${caption} from URL '${url}'`);
      return fetch(url, { headers: okapi.headers })
        .then(res => res.text().then(text => {
          if (res.status >= 400) throw new GraphQLError(text);
          const json = JSON.parse(text);
          if (typeof skeleton === 'string') {
            return json[skeleton];
          }
          // Skeleton is an object whose keys tell us what to return
          const val = {};
          Object.keys(skeleton).forEach(key => {
            val[key] = json[skeleton[key]];
          });
          return val;
        }));
    }


const resolvers = {
  Query: {
    hello: () => 'hi!',
    users: (root, { cql }, context) => {
      const okapi = context.okapi;
      return fetch(`${okapi.url}/users` + (cql ? `?query=${cql}` : ''),
        { headers: okapi.headers }).then((response) => {
        return response.json().then(json => {
          return json.users;
        });
      });
    },
    groups: (root, args, context) => {
      const okapi = context.okapi;
      return fetch(`${okapi.url}/groups`, { headers: okapi.headers }).then((response) => {
        return response.json().then(json => {
          return json.usergroups;
        });
      });
    },
    instances: (o, a, c) => resolve(o, a, c, 'instances', 'instance-storage/instances', null, null, {
        records: 'instances',
        totalCount: 'totalRecords',
      }),

    instance: (root, { id }, { okapi }) => {
      const url = `${okapi.url}/instance-storage/instances/${id}`;
      console.log(`instance from URL '${url}'`);
      return fetch(url, { headers: okapi.headers }).then((response) => {
        return response.json().then(json => {
          return json;
        });
      });
    },
  },

  Metadata: {
    createdByUser: (obj, args, { okapi }) => fetch(`${okapi.url}/users/${obj.createdByUserId}`,
      { headers: okapi.headers })
      .then(res => res.text().then(text => {
        if (res.status < 400) return JSON.parse(text);
        throw new Error(text);
      })),
    updatedByUser: (obj, args, { okapi }) => fetch(`${okapi.url}/users/${obj.updatedByUserId}`,
      { headers: okapi.headers })
      .then(res => res.text().then(text => {
        if (res.status < 400) return JSON.parse(text);
        throw new Error(text);
      })),
  },

  Instance: {
    instanceType: (obj, args, { okapi }) => fetch(`${okapi.url}/instance-types/${obj.instanceTypeId}`,
      { headers: okapi.headers })
      .then(res => res.text().then(text => {
        if (res.status < 400) return JSON.parse(text);
        throw new Error(text);
      })),
    instanceFormat: (obj, args, { okapi }) => {
      if (!obj.instanceFormatId) {
        return null;
      } else {
        return fetch(`${okapi.url}/instance-formats/${obj.instanceFormatId}`,
          { headers: okapi.headers })
          .then(res => res.text().then(text => {
            if (res.status < 400) return JSON.parse(text);
            throw new Error(text);
          }));
      }
    },
    holdingsRecords: (obj, args, { okapi }) => {
      const url = `${okapi.url}/holdings-storage/holdings?query=instanceId==${obj.id}`;
      console.log(`holdings from URL '${url}'`);
      return fetch(url, { headers: okapi.headers })
        .then(res => res.text().then(text => {
          if (res.status >= 400) throw new Error(text);
          const json = JSON.parse(text);
          return json.holdingsRecords;
        }));
    }
  },

  Identifier: {
    identifierType: (obj, args, { okapi }) => fetch(`${okapi.url}/identifier-types/${obj.identifierTypeId}`,
      { headers: okapi.headers })
      .then(res => res.text().then(text => {
        if (res.status < 400) return JSON.parse(text);
        throw new Error(text);
      })),
  },

  Contributor: {
    contributorType: (obj, args, { okapi }) => {
      if (!obj.contributorTypeId) {
        return null;
      } else {
        return fetch(`${okapi.url}/contributor-types/${obj.contributorTypeId}`,
          { headers: okapi.headers })
          .then(res => res.text().then(text => {
            if (res.status < 400) return JSON.parse(text);
            throw new Error(text);
          }));
      }
    },
    contributorNameType: (obj, args, { okapi }) => {
      if (!obj.contributorNameTypeId) {
        return null;
      } else {
        return fetch(`${okapi.url}/contributor-name-types/${obj.contributorNameTypeId}`,
          { headers: okapi.headers })
          .then(res => res.text().then(text => {
            if (res.status < 400) return JSON.parse(text);
            throw new Error(text);
          }));
      }
    },
  },

  Classification: {
    classificationType: (obj, args, { okapi }) => {
      if (!obj.classificationTypeId) {
        return null;
      } else {
        return fetch(`${okapi.url}/classification-types/${obj.classificationTypeId}`,
          { headers: okapi.headers })
          .then(res => res.text().then(text => {
            if (res.status < 400) return JSON.parse(text);
            throw new Error(text);
          }));
      }
    },
  },

  HoldingsRecord: {
    holdingsItems: (o, a, c) => resolve(o, a, c, 'items', 'inventory/items', 'id', 'holdingsRecordId', 'items'),
  },

  Mutation: {
    updateUser: (root, updated, { okapi }) => {
      // We don't currently support PATCH so we'll need to grab the record to base our update on
      return fetch(`${okapi.url}/users/${updated.id}`, { headers: okapi.headers })
        .then(res => res.json())
        .then((orig) => {
          const record = _.merge({}, orig, updated);
          return fetch(`${okapi.url}/users/${updated.id}`,
            { headers: okapi.headers, method: 'PUT', body: JSON.stringify(record) })
            .then(res => res.text().then(text => {
              if (res.status < 400) return record;
              throw new Error(text);
            }));
        });
    },
    createGroup: (root, { record }, { okapi }) => {
      return fetch(`${okapi.url}/groups`,
        { headers: okapi.headers, method: 'POST', body: JSON.stringify(record) })
        .then(res => res.text().then(text => {
          if (res.status < 400) return JSON.parse(text);
          throw new Error(text);
        }));
    },
    updateGroup: (root, { id, record }, { okapi }) => {
      const headers = Object.assign({}, okapi.headers, { 'Accept': 'text/plain' });
      return fetch(`${okapi.url}/groups/${id}`, { headers: okapi.headers })
        .then(res => res.json())
        .then((orig) => {
          const fullRecord = _.merge({}, orig, record);
          delete fullRecord.metadata;
          return fetch(`${okapi.url}/groups/${id}`,
            { headers, method: 'PUT', body: JSON.stringify(fullRecord) })
            .then(res => res.text().then(text => {
              if (res.status < 400) return fullRecord;
              throw new Error(text);
            }));
        });
    },
    deleteGroup: (root, { id }, { okapi }) => {
      const headers = Object.assign({}, okapi.headers, { 'Accept': 'text/plain' });
      return fetch(`${okapi.url}/groups/${id}`,
        { headers, method: 'DELETE' })
        .then(res => res.text().then(text => {
          if (res.status < 400) return id;
          throw new Error(text);
        }));
    },
  },
};


export default resolvers;
