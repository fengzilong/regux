import createLogger from './logger';

class Store {
	constructor( { state = {}, mutations = {}, plugins = [], autoUpdate = true } = {} ) {
		this._mutations = mutations;
		this._plugins = plugins;
		this._autoUpdate = autoUpdate;
		this._subscribers = [];

		Object.defineProperty( this, 'state', {
			get: () => state,
			set: () => { throw new Error( 'cannot set state directly' ) }
		} );

		for( let i = 0, len = plugins.length; i < len; i++ ) {
			let plugin = plugins[ i ];
			plugin( this );
		}
	}
	watch( getter, cb, options ) {

	}
	dispatch( mutation ) {
		// mutation -> { type: 'foo', payload: 'bar' }
		if( !isValidMutationObject( mutation ) ) {
			console.warn( 'invalid mutation', mutation );
			return;
		}

		const mutationType = mutation.type;
		const payload = mutation.payload;
		const mutate = this._mutations[ mutationType ];

		if( typeof mutate === 'function' ) {
			mutate( this.state, mutation );
			this._applySubscribers( mutation, this.state );
			if( this._autoUpdate ) {
				this._host.$update();
			}
		}

		return this;
	}
	host( target ) {
		this._host = target;
	}
	_applySubscribers( mutation, state ) {
		const subscribers = this._subscribers;

		if( subscribers.length === 0 ) {
			return;
		}

		// TODO: shall deepClone state?

		for ( let i = 0, len = subscribers.length; i < len; i++ ) {
			const subscriber = subscribers[ i ];
			subscriber( mutation, state );
		}
	}
	subscribe( fn ) {
		if( typeof fn !== 'function' ) {
			return;
		}

		this._subscribers.push( fn );

		return this;
	}
}

function isValidMutationObject( mutation ) {
	return typeof mutation.type !== 'undefined';
}

function isStore( ins ) {
	return ins && ins instanceof Store;
}

export default Store;
export { isStore };
