function($ctx, $args) {
	return ["id", new Date().getTime().toString(), Math.random().toString().replace(/\./g, "")].join("_")
}
