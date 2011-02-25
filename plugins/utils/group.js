function($ctx, $args, $out) {
	if($args.yield && $args[0] && $args[1] && $args[0] instanceof Array) {
		var g = []
		for(var i=0; i<$args[0].length; i++) {
			if(g.length==$args[1]) {
				$args.yield($ctx, [g], $out)
				g = []
			}
			g.push($args[0][i])
		}
		if(g.length)
			$args.yield($ctx, [g], $out)
	}
}
