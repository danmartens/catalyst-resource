// @flow

import axios from 'axios';
import { takeEvery, put, call } from 'redux-saga/effects';
import { forEach, isObject, isArray } from 'lodash';

type ResourceId = string | number;

type ResourceBuildURL = (
  actionType: string,
  resourceType: string,
  resourceId?: ResourceId
) => string;

type ResourcesConfig = {
  [string]: ResourceConfig
};

type ResourceConfig = {
  buildURL: ResourceBuildURL,
  adapter?: ResourceAdapter,
  serializer?: ResourceSerializer
};

class ResourceAdapter {
  findAll() {}

  findRecord(
    buildURL: ResourceBuildURL,
    resourceType: string,
    resourceId: ResourceId
  ): Promise<Object> {
    return axios
      .get(buildURL('RESOURCE/FIND_RECORD', resourceType, resourceId))
      .then(response => {
        return response.data;
      })
      .catch(() => {
        console.log('error');
      });
  }

  createRecord() {}
  updateRecord() {}
  deleteRecord() {}
}

class ResourceSerializer {}

export class ResourceModule {
  config: ResourcesConfig;

  constructor(config: ResourcesConfig) {
    this.config = {};
    this.initialState = {};

    forEach(config, (resourceConfig, resourceType) => {
      this.config[resourceType] = {
        adapter: new ResourceAdapter(),
        serializer: new ResourceSerializer(),
        ...resourceConfig
      };

      this.initialState[resourceType] = {
        records: {},
        recordStatus: {}
      };
    });

    this.saga = this.saga.bind(this);
    this.reducer = this.reducer.bind(this);
    this.findRecordSaga = this.findRecordSaga.bind(this);
  }

  configForResourceType(
    resourceType: string
  ): {
    buildURL: ResourceBuildURL,
    adapter: ResourceAdapter,
    serializer: ResourceSerializer
  } {
    if (this.config[resourceType] instanceof Object) {
      return this.config[resourceType];
    } else {
      throw new Error(
        `Couldn't find configuration for type "${resourceType}".`
      );
    }
  }

  adapterForResourceType(resourceType: string): ResourceAdapter {
    const { adapter } = this.configForResourceType(resourceType);

    if (adapter instanceof ResourceAdapter) {
      return adapter;
    } else {
      throw new Error(`Couldn't find an adpater for type "${resourceType}".`);
    }
  }

  findRecordAction(
    resourceType: string,
    resourceId: ResourceId,
    status: ?string = null
  ) {
    return {
      type: 'RESOURCE/FIND_RECORD',
      resourceType,
      status,
      payload: {
        id: resourceId
      }
    };
  }

  reducer(state, action) {
    if (state === undefined) {
      return this.initialState;
    }

    switch (action.type) {
      case 'RESOURCE/FIND_RECORD': {
        switch (action.status) {
          case 'success': {
            return mergeJSONDataIntoState(state, action.payload);
          }
        }
      }
    }

    return state;
  }

  initialState() {
    return { hello: 'world' };
  }

  *saga(): Generator<*, *, *> {
    yield takeEvery('RESOURCE/FIND_RECORD', this.findRecordSaga);
  }

  *findRecordSaga(action: {
    type: string,
    resourceType: string,
    payload: { id: ResourceId }
  }): Generator<*, *, *> {
    const { resourceType, status } = action;

    if (status == null) {
      try {
        const adapter = this.adapterForResourceType(resourceType);

        const response = yield call(
          adapter.findRecord,
          this.configForResourceType(resourceType).buildURL,
          action.resourceType,
          action.payload.id
        );

        yield put({
          type: action.type,
          resourceType: action.resourceType,
          status: 'success',
          payload: response.data
        });
      } catch (error) {
        yield put({
          type: action.type,
          resourceType: action.resourceType,
          status: 'error',
          payload: error
        });
      }
    }
  }
}

function mergeJSONDataIntoState(state: Object, data: Object) {
  let nextState = state;

  if (isObject(data)) {
    nextState = {
      ...nextState,
      [data.type]: {
        ...nextState[data.type],
        records: {
          ...nextState[data.type].records,
          [data.id]: data.attributes
        }
      }
    };
  } else if (isArray(data)) {
    nextState = data.reduce(datum => {
      return mergeJSONDataIntoState(nextState, datum);
    }, nextState);
  }

  return nextState;
}
