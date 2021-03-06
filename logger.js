(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.logger = factory());
}(this, (function () { 'use strict';

// Credits: fcomb/redux-logger

function createLogger( ref ) {
	if ( ref === void 0 ) ref = {};
	var collapsed = ref.collapsed; if ( collapsed === void 0 ) collapsed = true;
	var transformer = ref.transformer; if ( transformer === void 0 ) transformer = function (state) { return state; };
	var mutationTransformer = ref.mutationTransformer; if ( mutationTransformer === void 0 ) mutationTransformer = function (mut) { return mut; };

	return function (store) {
		var prevState = JSON.parse( JSON.stringify( store.getState() ) );
		store.subscribe( function ( mutation, state ) {
			var nextState = JSON.parse( JSON.stringify( state ) );
			var time = new Date();
			var formattedTime = " @ " + (pad( time.getHours(), 2 )) + ":" + (pad( time.getMinutes(), 2 )) + ":" + (pad( time.getSeconds(), 2 )) + "." + (pad( time.getMilliseconds(), 3 ));
			var message = "commit " + (mutation.type) + formattedTime;

			if ( collapsed ) {
				console.groupCollapsed( message );
			} else {
				console.group( message );
			}

			console.log( '%c prev state', 'color: #9E9E9E; font-weight: bold', transformer( prevState ) );
			console.log( '%c commit', 'color: #03A9F4; font-weight: bold', mutationTransformer( mutation ) );
			console.log( '%c next state', 'color: #4CAF50; font-weight: bold', transformer( nextState ) );

			console.groupEnd( message );

			prevState = nextState;
		} );
	};
}

function repeat( str, times ) {
	return ( new Array( times + 1 ) ).join( str );
}

function pad( num, maxLength ) {
	return repeat( '0', maxLength - num.toString().length ) + num;
}

return createLogger;

})));
