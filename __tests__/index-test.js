import Pretender from 'pretender';
import axios from 'axios';
import { createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { ResourceModule } from '../index';

const server = new Pretender(function() {
  this.get('/api/posts', function(request) {
    return [
      200,
      { 'content-type': 'application/javascript' },
      JSON.stringify({
        data: {
          type: 'post',
          id: 1,
          attributes: {
            title: 'Hello World'
          }
        }
      })
    ];
  });
});

const Resources = new ResourceModule({
  post: {
    buildURL: () => '/api/posts'
  }
});

const sagaMiddleware = createSagaMiddleware();

function nextState(store, action) {
  return new Promise(resolve => {
    const unsubscribe = store.subscribe(() => {
      unsubscribe();
      resolve(store.getState());
    });

    if (action != null) {
      store.dispatch(action);
    }
  });
}

test('it works', async () => {
  const store = createStore(Resources.reducer, applyMiddleware(sagaMiddleware));

  sagaMiddleware.run(Resources.saga);

  let state = await nextState(store, Resources.findRecordAction('post', 1));

  expect(state).toEqual({
    post: {
      records: {},
      recordStatus: {}
    }
  });

  state = await nextState(store);

  expect(state).toEqual({
    post: {
      records: {
        '1': {
          title: 'Hello World'
        }
      },
      recordStatus: {}
    }
  });
});
