// mutationType is unique in global scope
// which is defined in one file
// named constants.js in Redux, mutation-types.js in vuex
class Store {
	constructor( { state = {}, mutations = {}, modules = {}, plugins = [], autoUpdate = true } = {} ) {
		Object.assign( this, {
			_mutations: mutations,
			_modules: modules,
			_plugins: plugins,
			_autoUpdate: autoUpdate,
			_subscribers: []
		} );

		Object.defineProperty( this, 'state', {
			get() {
				return state;
			},
			set() {
				throw new Error( 'cannot set state directly' );
			},
		} );

		for ( let i in modules ) {
			const module = modules[ i ];
			const moduleState = module.state || {};
			const moduleMutations = module.mutations || {};
			state[ i ] = moduleState;
			for ( let j in moduleMutations ) {
				moduleMutations[ j ].key = i;
			}
			merge( this._mutations, moduleMutations );
		}

		// execute plugins
		for ( let i = 0, len = plugins.length; i < len; i++ ) {
			let plugin = plugins[ i ];
			plugin( this );
		}
	}
	// watch( getter, cb, options ) {
	//
	// }
	commit() {
	}
	dispatch( mutation ) {
		// mutation -> { type: 'foo', payload: 'bar' }
		if ( !isValidMutationObject( mutation ) ) {
			return console.warn( 'invalid mutation', mutation );
		}

		const mutate = this._mutations[ mutation.type ];
		if ( typeof mutate === 'function' ) {
			let state = typeof mutate.key === 'undefined' ? this.state : this.state[ mutate.key ];

			mutate( state, mutation );

			this._applySubscribers( mutation, this.state );

			// TODO: remove, use commit to force update
			if ( this._autoUpdate ) {
				this._host.$update();
			}
		}

		return this;
	}
	host( target ) {
		this._host = target;
	}
	subscribe( fn ) {
		if ( typeof fn !== 'function' ) {
			return;
		}

		this._subscribers.push( fn );

		return this;
	}
	_applySubscribers( mutation, state ) {
		const subscribers = this._subscribers;

		if ( subscribers.length === 0 ) {
			return;
		}

		// TODO: shall we deepClone state?

		for ( let i = 0, len = subscribers.length; i < len; i++ ) {
			const subscriber = subscribers[ i ];
			subscriber( mutation, state );
		}
	}
}

function merge( dest = {}, ...source ) {
	let i, j, len;
	for ( i = 0, len = source.length; i < len; i++ ) {
		let src = source[ i ];
		for ( j in src ) {
			if ( j in dest ) {
				console.warn( `[merge]: ${ j } already existed, will be overrided` );
			}
			dest[ j ] = src[ j ];
		}
	}
	return dest;
}

function isValidMutationObject( mutation ) {
	return typeof mutation.type !== 'undefined';
}

function isStore( ins ) {
	return ins && ins instanceof Store;
}

export default Store;
export { isStore };
