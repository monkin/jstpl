function($ctx, $args, $out) {
	var k = null;
	for(var i in $args)
		if($args[i] && (k===null || i<k))
			k = i;
	if(k!==null)
		$out.push($args[k]);
}
