export default class Scheduler {
	constructor() {
		this.t = null;
		this.tasks = [];
	}
	add( task ) {
		this.tasks.push( task );
	}
	run( main ) {
		if ( this.t ) {
			clearTimeout( this.t );
		}

		this.t = setTimeout( () => {
			main();

			this.tasks.forEach( ( task, i ) => {
				if ( typeof task === 'function' ) {
					task();
					this.tasks[ i ] = null;
				}
			} );
			this.tasks.length = 0;
		}, 0 );
	}
}
