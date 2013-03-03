function($ctx, $args) {
	var i, keys
	for(var i in $args)
		keys.push(/^\d+$/.test(i) ? parseInt(i, 10) : i)
	keys.sort(function(k1, k2) {
		return k1 > k2 ? 1 : (k1 < k2 ? -1 : 0);
	})
	for(var i in keys)
		if($args[keys[i]])
			return $args[keys[i]]
	return ""
}
