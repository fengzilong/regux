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
						console.group( 'store already exists' );
						console.log( 'old store:', store );
						console.log( 'new store:', this.store );
						console.groupEnd( 'store already exists' );
						console.warn( 'old store will be used' );
					} else {
						// get store
						store = this.store;
						store.host( this );
						delete this.store;
					}
				}

				this.$store = store;

				// regux
				const { regux = {} } = this;
				// mutations, actions, getters
				const { actions = {}, getters = {} } = regux;

				let keys;

				keys = Object.keys( getters );
				for ( let i = 0, len = keys.length; i < len; i++ ) {
					const key = keys[ i ];
					const getter = getters[ key ];
					getters[ key ] = function () {
						return getter( store.state );
					};
				}
				makeComputed( this, getters );

				keys = Object.keys( actions );
				for ( let i = 0, len = keys.length; i < len; i++ ) {
					const key = keys[ i ];
					const action = actions[ key ];
					this[ key ] = function ( ...args ) {
						return action.apply( this, [ store, ...args ] );
					};
				}
			}
		}
	} );
};

regux.Store = Store;

export default regux;
