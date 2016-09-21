class Store {
	constructor( { state = {}, mutations = {}, plugins = [], autoUpdate = true } = {} ) {
		this._mutations = mutations;
		this._plugins = plugins;
		this._autoUpdate = autoUpdate;

		Object.defineProperty( this, 'state', {
			get: () => state,
			set: () => { throw new Error( 'cannot set state directly' ) }
		} );
	}
	watch( getter, cb, options ) {

	}
	dispatch( mutation ) {
		// mutation -> { type: 'foo', payload: 'bar' }
		if( !isValidMutationObject( mutation ) ) {
			console.warn( 'invalid mutation', mutation );
			return;
		}

		const mutationName = mutation.type;
		const payload = mutation.payload;
		const mutationFn = this._mutations[ mutationName ];

		if( typeof mutationFn === 'function' ) {
			mutationFn( this.state, mutation );
			console.log( 'mutated', this.state );
			if( this._autoUpdate ) {
				this._host.$update();
			}
		}

		return this;
	}
	host( target ) {
		this._host = target;
	}
	subscribe( fn ) {
		if( typeof fn !== 'function' ) {
			return;
		}

		this._subscribeFns = this._subscribeFns || [];
		this._subscribeFns.push( fn );

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
