/* eslint-disable no-loop-func */

import makeComputed from './computed';
import Store, { isStore } from './store';

const regux = Component => {
	// one store in Component scope
	let store;
	Component.implement( {
		events: {
			$config() {
				if ( isStore( this.store ) ) {
					if ( store ) {
						// store already exists
						console.groupCollapsed( 'store already exists' );
						console.log( 'old store:', store );
						console.log( 'new store:', this.store );
						console.groupEnd( 'store already exists' );
						console.warn( 'old store will be used' );
					} else {
						// save store
						store = this.store;
						store.host( this );
						delete this.store;
					}
				}

				if ( !store ) {
					return console.error( 'store not found' );
				}

				this.$store = store;
				this.commit = store.commit.bind( store );
				this.dispatch = store.dispatch.bind( store );
				this.nextTick = store.queue.bind( store );

				// regux
				const { getters = {} } = this;

				let keys;

				keys = Object.keys( getters );
				for ( let i = 0, len = keys.length; i < len; i++ ) {
					const key = keys[ i ];
					const getter = getters[ key ];
					getters[ key ] = function () {
						return getter( store.state );
					};
				}
				// TODO: 从state获取的getters依赖，脏值检查一轮就可以全部稳定下来，需要考虑下是否有必要使用计算属性
				makeComputed( this, getters );
			}
		}
	} );
};

regux.Store = Store;

export default regux;
