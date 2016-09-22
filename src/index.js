import makeComputed from './computed';
import Store, { isStore } from './store';

const regux = Component => {
	// one store in Component scope
	let store;
	Component.implement({
		events: {
			$config: function() {
				if( isStore( this.store ) ) {
					if( !store ) {
						// get store
						store = this.store;
						store.host( this );
						delete this.store;
					} else {
						// store already exists
						console.group( 'store already exists' );
						console.log( 'old store:', store );
						console.log( 'new store:', this.store );
						console.groupEnd( 'store already exists' );
						console.warn( 'old store will be used' );
					}
				}

				this.$store = store;

				// regux
				let { regux } = this;
				regux = regux || {};

				// mutations, actions, getters
				let { mutations, actions, getters } = regux;
				mutations = mutations || {};
				actions = actions || {};
				getters = getters || {};

				let keys;

				keys = Object.keys( getters );
				for ( let i = 0, len = keys.length; i < len; i++ ) {
					let key = keys[ i ];
					let getter = getters[ key ];
					getters[ key ] = function( data ) {
						return getter( store.state );
					};
				}
				makeComputed( this, getters );

				keys = Object.keys( actions );
				for ( let i = 0, len = keys.length; i < len; i++ ) {
					let key = keys[ i ];
					let action = actions[ key ];
					this[ key ] = function( ...args ) {
						return action.apply( this, [ store, ...args ] );
					};
				}
			}
		}
	})
};

regux.Store = Store;

export default regux;
