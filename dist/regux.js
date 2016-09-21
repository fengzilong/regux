(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.regux = factory());
}(this, (function () { 'use strict';

var handleComputed = (function(){
	// wrap the computed getter;
	function wrapGet(get){
		return function(context){
			return get.call(context, context.data );
		}
	}
	// wrap the computed setter;
	function wrapSet(set){
		return function(context, value){
			set.call( context, value, context.data );
			return value;
		}
	}

	return function(computed){
		if(!computed) { return; }
		var parsedComputed = {}, handle, pair, type;
		for(var i in computed){
			handle = computed[i]
			type = typeof handle;

			if(handle.type === 'expression'){
				parsedComputed[i] = handle;
				continue;
			}
			if( type === "string" ){
				parsedComputed[i] = parse.expression(handle)
			}else{
				pair = parsedComputed[i] = {type: 'expression'};
				if(type === "function" ){
					pair.get = wrapGet(handle);
				}else{
					if(handle.get) { pair.get = wrapGet(handle.get); }
					if(handle.set) { pair.set = wrapSet(handle.set); }
				}
			}
		}
		return parsedComputed;
	}
})();

var Store = function Store( ref ) {
	if ( ref === void 0 ) ref = {};
	var state = ref.state; if ( state === void 0 ) state = {};
	var mutations = ref.mutations; if ( mutations === void 0 ) mutations = {};
	var plugins = ref.plugins; if ( plugins === void 0 ) plugins = [];
	var autoUpdate = ref.autoUpdate; if ( autoUpdate === void 0 ) autoUpdate = true;

	this._mutations = mutations;
	this._plugins = plugins;
	this._autoUpdate = autoUpdate;

	Object.defineProperty( this, 'state', {
		get: function () { return state; },
		set: function () { throw new Error( 'cannot set state directly' ) }
	} );
};
Store.prototype.watch = function watch ( getter, cb, options ) {

};
Store.prototype.dispatch = function dispatch ( mutation ) {
	// mutation -> { type: 'foo', payload: 'bar' }
	if( !isValidMutationObject( mutation ) ) {
		console.warn( 'invalid mutation', mutation );
		return;
	}

	var mutationName = mutation.type;
	var payload = mutation.payload;
	var mutationFn = this._mutations[ mutationName ];

	if( typeof mutationFn === 'function' ) {
		mutationFn( this.state, mutation );
		console.log( 'mutated', this.state );
		if( this._autoUpdate ) {
			this._host.$update();
		}
	}

	return this;
};
Store.prototype.host = function host ( target ) {
	this._host = target;
};
Store.prototype.subscribe = function subscribe ( fn ) {
	if( typeof fn !== 'function' ) {
		return;
	}

	this._subscribeFns = this._subscribeFns || [];
	this._subscribeFns.push( fn );

	return this;
};

function isValidMutationObject( mutation ) {
	return typeof mutation.type !== 'undefined';
}

function isStore( ins ) {
	return ins && ins instanceof Store;
}

var regux = function (Component) {
	// one store in Component scope
	var store;
	Component.implement({
		events: {
			$config: function() {
				var this$1 = this;

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
				var ref = this;
				var regux = ref.regux;
				regux = regux || {};

				// mutations, actions, getters
				var mutations = regux.mutations;
				var actions = regux.actions;
				var getters = regux.getters;
				mutations = mutations || {};
				actions = actions || {};
				getters = getters || {};

				var keys;

				keys = Object.keys( getters );
				var loop = function ( i, len ) {
					var key = keys[ i ];
					var getter = getters[ key ];
					getters[ key ] = function( data ) {
						return getter( store.state );
					};
				};

				for ( var i = 0, len = keys.length; i < len; i++ ) loop( i, len );
				Object.assign( this.computed || {}, handleComputed( getters ) );

				keys = Object.keys( actions );
				var loop$1 = function ( i, len ) {
					var key$1 = keys[ i ];
					var action = actions[ key$1 ];
					this$1[ key$1 ] = function() {
						var args = [], len = arguments.length;
						while ( len-- ) args[ len ] = arguments[ len ];

						return action.apply( this, [ store ].concat( args ) );
					};
				};

				for ( var i$1 = 0, len$1 = keys.length; i$1 < len$1; i$1++ ) loop$1( i$1, len$1 );
			}
		}
	})
};

regux.Store = Store;

return regux;

})));
