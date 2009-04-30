if (!this.Meeko) this.Meeko = {};

Meeko.Parser = (function() {
	var constructor = function(grammar) {
		this.grammar = {};
		for (var id in grammar) {
			var confRule = grammar[id];
			var ruleList = (confRule instanceof Array) ? confRule : [ confRule ];
			this.grammar[id] = [];
			for (var i=0, n=ruleList.length; i<n; i++) {
				this.grammar[id][i] = {};
				var subrule = ruleList[i];
				if (subrule.start) {
					if (subrule.start instanceof RegExp) throw "START properties must point to another rule";
					if (subrule.match || subrule.next) throw "A rule with START property may not have MATCH or NEXT properties";
					if (!grammar[subrule.start]) throw "The START property does not point to a valid rule: " + subrule.start;
					this.grammar[id][i].start = subrule.start;
					continue;
				}
				if (subrule.match || 0 === subrule.match || "" === subrule.match) {
					var match = subrule.match;
					var matchList = (match instanceof Array) ? match : [ match ];
					this.grammar[id][i].match = matchList;
					if (subrule.next && !grammar[subrule.next]) throw "The NEXT property does not point to a valid rule: " + subrule.next;
					if (subrule.next) this.grammar[id][i].next = subrule.next;
					continue;
				}
				throw "Subrule has no properties";
			}
		}
		
		this.reset();
	}

	constructor.prototype.reset = function() {
		this.stack = [];
	}
	
	constructor.prototype.pushState = function(state) {
		this.stack.push(state);
	}
	
	constructor.prototype.popState = function() {
		return this.stack.pop();
	}
	
	constructor.prototype.parse = function(text, entry, handler) {
		var grammar = this.grammar;
		if (grammar[entry].next) throw "Cannot enter parse table at a rule that has a NEXT property";
		this.entry = entry;
		
		this.text = text;
		this.handler = handler;
		
		this.doParse();
		return handler.getResult();
	}
	
	constructor.prototype.doParse = function() {
	this.result = null;
	this.pushState({ id: this.entry, ruleNo: 0, matchNo: 0, stage: 0 });
	
RULE:
	for (;;) {
		var state = this.popState();
		if (!state) return;
		var ruleList = this.grammar[state.id];

STAGE:
		for (;;) {
			var subrule = ruleList[state.ruleNo];
			var expr = (subrule.match) ? subrule.match[state.matchNo] : null;

			switch (state.stage) {
			case 0:
				if (subrule.start) {
					state.stage = 1;
					this.pushState(state);
					this.pushState({ id: subrule.start, ruleNo: 0, matchNo: 0, stage: 0 });
					continue RULE;
				}
				
				if ("" == expr) {
					this.result = "";
					state.stage = 1;
					continue STAGE;
				}
				else if (expr instanceof RegExp) {
					var m = expr.exec(this.text);
					if (m) {
						this.text = this.text.substr(m[0].length);
						this.result = m;
						state.stage = 1;
						continue STAGE;
					}
					else {
						this.result = null;
						state.stage = 1;
						continue STAGE;
					}
				}
				else {
					state.stage = 1;
					this.pushState(state);
					this.pushState({ id: expr, ruleNo: 0, matchNo: 0, stage: 0 });
					continue RULE;
				}
				throw "Error in Parser stage " + state.stage;
			
			case 1:
				
				if (null == this.result) {
					state.stage = 0;
					if (subrule.match) state.matchNo++;
					if (subrule.start || state.matchNo >= subrule.match.length) {
						state.matchNo = 0;
						state.ruleNo++;
					}
					if (state.ruleNo < ruleList.length) continue STAGE;
					else continue RULE;
				}

				this.handler.handleEvent(state.id, this.result);
				
				if (subrule.next) {
					this.result = null;
					this.pushState({ id: subrule.next, ruleNo: 0, matchNo: 0, stage: 0 });
					continue RULE;
				}
				else {
					this.result = state.id;
					continue RULE;
				}
				throw "Error in Parser stage " + state.stage;
			}
		}
	}
	
	}
	
	return constructor;

})();
