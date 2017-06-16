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
					return console.warn( 'store not found' );
				}

				this.$store = store;
				this.commit = store.commit.bind( store );
				this.dispatch = store.dispatch.bind( store );
				this.nextTick = store.nextTick.bind( store );

				const commonGetters = store.getGetters();

				const { getters = {} } = this;
				Object.keys( getters ).forEach( key => {
					let getter = getters[ key ];

					// if getter is string, try getting it from commonGetters
					if ( typeof getter === 'string' ) {
						getter = commonGetters[ getter ];
					}

					if ( typeof getter === 'function' ) {
						getters[ key ] = function () {
							return getter( store.getState() );
						};
					}
				} );
				makeComputed( this, getters );
			}
		}
	} );
};

regux.Store = Store;

export default regux;
