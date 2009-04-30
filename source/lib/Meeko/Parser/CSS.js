/*
This API and implementation is a Frankenstein of:
1. W3C Simple API for CSS
	http://www.w3.org/TR/SAC
	http://www.w3.org/Style/CSS/SAC/doc/org/w3c/css/sac/package-summary.html
2. CSS Editing and Selectors Object Models
	Daniel Glazman
	http://daniel.glazman.free.fr/csswg/csseom/csseom-0.00-01.htm
3. XPath model: axis/node-test/predicate
*/

/*
TODO
- DocumentHandler & ErrorHandler
- stylesheet & property parsing
*/

CSS = (function() {	


var Parser = function() {
	this.parser = new Meeko.Parser(_grammar);
}

Parser.prototype.parseSelectors = function(text)
{
	var selectorList = this.parser.parse(text, "selectorList", _handler);
	Array.forEach (selectorList, function(selector) {
		selector.__refresh();
	});
	return selectorList;
}

// TODO how to implement SelectorList magic?
var SelectorList = function() {}
SelectorList.prototype.addSelector = function(selector) {
	this.push(selector);
}

SelectorList.prototype.test = function(element) {
	var n = this.length;
	for (var i=0; i<n; i++) {
		var selector = this[i];
		var rc = selector.test(element);
		if (rc) return true;
	}
	return false;
}


/*
interface Selector {
	RelativeSelector steps[];
	Specificity specifity;
}
*/
var Selector = function() {
	this.steps = [];
	this.specificity = new Specificity();
}

Selector.prototype.__refresh = function() {
	this.specificity = Selector.__get_specificity(this);
}

Selector.__get_specificity = function(selector) {
	var aCount = 0, bCount = 0, cCount = 0;
	Array.forEach (selector.steps, function(step) {
		Array.forEach (step.conditions, function(condition) {
			switch (condition.conditionType) {
				case Condition.NODE_TEST_CONDITION:
					if (Node.ELEMENT_NODE == condition.nodeType && condition.localName && "*" != condition.localName) cCount++;
					break;
				case Condition.ID_CONDITION:
					aCount++;
					break;
				case Condition.PSEUDO_ELEMENT_CONDITION:
					break;
				default:
					bCount++;
					break;
			}
		});
	});
	return new Specificity(aCount, bCount, cCount);
}

Selector.prototype.addStep = function(step) {
	if (step instanceof RelativeSelector) this.steps.push(step);
	else throw "Error in Selector.addStep";
}

Selector.prototype.test = function(element) {
	var curElt = element;
	var rel = null;
	var n = this.steps.length;
	with (RelativeSelector) for (var i=n-1; i>=0; i--) {
		var step = this.steps[i];
		do {
			var rc = step.test(curElt);
			switch (rel) {
				default:
					if (!rc) return false; // no more chances
					else rel = null; // NOTE rel is already null
					break;
				case DESCENDANT_RELATIVE:
					if (!rc) { // keep trying ancestors unless already at top of tree
						if (document.documentElement == curElt) return false; // can't go any higher
						curElt = curElt.parentNode;
						if (!curElt) return false; // NOTE this could only happen in an unattached tree
					}
					else rel = null;
					break;
				case CHILD_RELATIVE:
					if (!rc) return false; // no second chance
					else rel = null;
					break;
				case INDIRECT_ADJACENT_RELATIVE:
					if (!rc) { // keep trying preceding-siblings
						curElt = curElt.previousSibling;
						if (!curElt) return false;
					}
					else rel = null;
					break;
				case DIRECT_ADJACENT_RELATIVE:
					if (!rc) return false; // no second chance
					else rel = null;
					break;
			}
		} while (rel);
		rel = step.relationType;
		switch (rel) {
			default: break;
			case DESCENDANT_RELATIVE: case CHILD_RELATIVE:
				if (document.documentElement == curElt) return false; // can't go any higher
				curElt = curElt.parentNode;
				if (!curElt) return false;
				break;
			case INDIRECT_ADJACENT_RELATIVE: case DIRECT_ADJACENT_RELATIVE:
				curElt = curElt.previousSibling;
				if (!curElt) return false;
				break;
		}
	}
	return true;
}



/*
interface Specificity {
	int aCount;
	int bCount;
	int cCount;
}
*/
var Specificity = function(a,b,c) {
	this.aCount = a || 0;
	this.bCount = b || 0;
	this.cCount = c || 0;
}

Specificity.cmp = function(first, second) {
	if (first.aCount > second.aCount) return 1;
	if (first.aCount < second.aCount) return -1;
	if (first.bCount > second.bCount) return 1;
	if (first.bCount < second.bCount) return -1;
	if (first.cCount > second.cCount) return 1;
	if (first.cCount < second.cCount) return -1;
	return 0;
}
	
/*
interface RelativeSelector {
	int relationType;
	Condition conditions[];
}
*/
var RelativeSelector = function() {
	this.relationType = null;
	this.conditions = [];
}
RelativeSelector.NO_RELATIVE = 0;
RelativeSelector.DESCENDANT_RELATIVE = 1;
RelativeSelector.CHILD_RELATIVE = 2;
RelativeSelector.DIRECT_ADJACENT_RELATIVE = 3;
RelativeSelector.INDIRECT_ADJACENT_RELATIVE = 4;

RelativeSelector.prototype.addCondition = function(condition) {
	if (condition instanceof Condition) this.conditions.push(condition);
	else throw "Error in RelativeSelector.addCondition";
}

RelativeSelector.prototype.test = function(element) {
	var n = this.conditions.length;
	for (var i=0; i<n; i++) {
		var rc = this.conditions[i].test(element);
		if (!rc) return false;
	}
	return true;
}


/*
interface Condition {
	int conditionType;
	int nodeType;
	boolean negativeCondition;
}
*/
var Condition = function() {}
Condition.NODE_TEST_CONDITION = 1;
Condition.ID_CONDITION = 2;
Condition.CLASS_CONDITION = 3;
Condition.PSEUDO_ELEMENT_CONDITION = 4;
Condition.ATTRIBUTE_CONDITION = 5;
Condition.ONE_OF_ATTRIBUTE_CONDITION = 6;
Condition.BEGIN_HYPHEN_ATTRIBUTE_CONDITION = 7;
Condition.STARTS_WITH_ATTRIBUTE_CONDITION = 8;
Condition.ENDS_WITH_ATTRIBUTE_CONDITION = 9;
Condition.CONTAINS_ATTRIBUTE_CONDITION = 10;
Condition.LANG_CONDITION = 11;
Condition.ONLY_CHILD_CONDITION = 12;
Condition.ONLY_TYPE_CONDITION = 13;
Condition.POSITIONAL_CONDITION = 14;
Condition.PSEUDO_CLASS_CONDITION = 15;
Condition.IS_ROOT_CONDITION = 16;
Condition.IS_EMPTY_CONDITION = 17;


Condition.prototype.test = function(element) { // TODO namespace handling
	var attrValue = element.getAttribute(this.localName); // TODO does this return null if attribute doesn't exist?  What about empty attributes?
	switch (this.conditionType) {
		case Condition.NODE_TEST_CONDITION:
			if (Node.ELEMENT_NODE != this.nodeType) return false; // TODO should we allow tests for other node types?
			if (!this.localName || "*" == this.localName) return true;
			if (element.tagName.toLowerCase() == this.localName.toLowerCase()) return true;
			return false;
			break;
		case Condition.ID_CONDITION:
			attrValue = element.getAttribute("id"); // TODO what about other namespaces where ID != @id?
			if (attrValue == this.value) return true;
			return false;
			break;
		case Condition.CLASS_CONDITION:
			var rex = new RegExp(" "+this.value+" ");
			attrValue = element.getAttribute("class");
			if (rex.test(" "+attrValue+" ")) return true;
			return false;
			break;
		case Condition.PSEUDO_CLASS_CONDITION: // TODO
			break;
		case Condition.PSEUDO_ELEMENT_CONDITION: // TODO
			break;
		case Condition.LANG_CONDITION: // TODO
			break;
		case Condition.ONLY_CHILD_CONDITION: // TODO
			break;
		case Condition.ONLY_TYPE_CONDITION: // TODO
			break;
		case Condition.POSITIONAL_CONDITION: // TODO
			break;
		case Condition.IS_ROOT_CONDITION:
			if (document.documentElement == element) return true;
			return false;
			break;
		case Condition.IS_EMPTY_CONDITION: // TODO
			break;
		case Condition.ATTRIBUTE_CONDITION:
			if (!this.specified || null == this.value) return true;
			if (attrValue == this.value) return true;
			return false;
			break;
		case Condition.ONE_OF_ATTRIBUTE_CONDITION:
			var rex = new RegExp(" "+this.value+" ");
			if (rex.test(" "+attrValue+" ")) return true;
			return false;
			break;
		case Condition.BEGIN_HYPHEN_ATTRIBUTE_CONDITION:
			if (attrValue == this.value) return true;
			var rex = new RegExp("^"+this.value+"-");
			if (rex.test(" "+attrValue+" ")) return true;
			return false;
			break;
		case Condition.STARTS_WITH_ATTRIBUTE_CONDITION:
			var rex = new RegExp("^"+this.value);
			if (rex.test(attrValue)) return true;
			return false;
			break;
		case Condition.ENDS_WITH_ATTRIBUTE_CONDITION:
			var rex = new RegExp(this.value+"$");
			if (rex.test(attrValue)) return true;
			return false;
			break;
		case Condition.CONTAINS_ATTRIBUTE_CONDITION:
			var rex = new RegExp(this.value);
			if (rex.test(attrValue)) return true;
			return false;
			break;	
	}
	throw "Error in Condition.test()"; 
}


var _selectorFactory = {
// PrimarySelector objects are always passed inside Selector objects
// Hence these functions always return a Selector
// and receive Selectors unless otherwise specified
	createElementSelector: function(name, ns) {
		var s = new Selector();
		var r = new RelativeSelector();
		var c = new Condition();
		c.conditionType = Condition.NODE_TEST_CONDITION;
		c.nodeType = Node.ELEMENT_NODE;
		c.localName = name;
		c.namespaceURI = ns;
		r.relationType = RelativeSelector.DESCENDANT_RELATIVE; // The default
		r.addCondition(c);
		s.addStep(r);
		return s;
	},
	createConditionalSelector: function(s, /* RelativeSelector: */ condition) {
		var r = s.steps[0];
		var r2 = condition;
		Array.forEach (r2.conditions, function(c) {
			r.addCondition(c);
		});
		return s;
	},
	createCombinatorialSelector: function(s, relative, relationType) {
		var r = relative.steps.pop();
		r.relationType = relationType || RelativeSelector.DESCENDANT_RELATIVE;
		s.addStep(r);
		return s;
	},
	createDescendantSelector: function(s, descendant) {
		return this.createCombinatorialSelector(s, descendant, RelativeSelector.DESCENDANT_RELATIVE);
	},
	createChildSelector: function(s, child) {
		return this.createCombinatorialSelector(s, child, RelativeSelector.CHILD_RELATIVE);
	},
	createIndirectAdjacentSelector: function(nodeType, s, adjacent) { // TODO what is nodeType?
		return this.createCombinatorialSelector(s, child, RelativeSelector.INDIRECT_ADJACENT_RELATIVE);
	},
	createDirectAdjacentSelector: function(nodeType, s, adjacent) { // TODO what is nodeType?
		return this.createCombinatorialSelector(s, child, RelativeSelector.DIRECT_ADJACENT_RELATIVE);
	}
};

var _conditionFactory = {
// Condition objects are always passed inside RelativeSelector objects.
// Hence these functions always return RelativeSelector,
// and receive condition objects in a similar way
	createAndCondition: function(r, r2) {
		Array.forEach (r2.conditions, function(c) {
			r.addCondition(c);
		});
		return r;
	},

	createOrCondition: function(r, r2) {
		throw "SAC_OR_CONDITION not implemented";
	},

	createIdCondition: function(value) {
		var r = new RelativeSelector();
		var c = new Condition();
		c.conditionType = Condition.ID_CONDITION;
		c.value = value;
		r.addCondition(c);
		return r;
	},

	createClassCondition: function(ns, value) {
		var r = new RelativeSelector();
		var c = new Condition();
		c.conditionType = Condition.CLASS_CONDITION;
		c.namespaceURI = ns; // TODO is this relavent?
		c.value = value;
		r.addCondition(c);
		return r;
	},

	createAttributeCondition: function(name, ns, specified, value, conditionType) {
		var r = new RelativeSelector();
		var c = new Condition();
		c.conditionType = conditionType || Condition.ATTRIBUTE_CONDITION;
		c.localName = name;
		c.namespaceURI = ns;
		c.specified = specified;
		c.value = value;
		r.addCondition(c);
		return r;
	},

	createBeginHyphenAttributeCondition: function(name, ns, specified, value) {
		return this.createAttributeCondition(name, ns, specified, value, Condition.BEGIN_HYPHEN_ATTRIBUTE_CONDITION);
	},

	createOneOfAttributeCondition: function(name, ns, specified, value) {
		return this.createAttributeCondition(name, ns, specified, value, Condition.ONE_OF_ATTRIBUTE_CONDITION);
	},

	createStartsWithAttributeCondition: function(name, ns, specified, value) {
		return this.createAttributeCondition(name, ns, specified, value, Condition.STARTS_WITH_ATTRIBUTE_CONDITION);
	},

	createEndsWithAttributeCondition: function(name, ns, specified, value) {
		return this.createAttributeCondition(name, ns, specified, value, Condition.ENDS_WITH_ATTRIBUTE_CONDITION);
	},

	createContainsAttributeCondition: function(name, ns, specified, value) {
		return this.createAttributeCondition(name, ns, specified, value, Condition.CONTAINS_ATTRIBUTE_CONDITION);
	},

	createOnlyChildCondition: function() {
		// TODO
	},

	createPositionalCondition: function(position, typeNode, type) {
		// TODO
	},

	createPseudoClassCondition: function(ns, value) {
		// TODO
	}
	
}

var _grammar = {
	
	selectorList: { start: "firstSelector" },
	firstSelector: { match: "selector", next: "groupedSelector" },
	groupedSelector: [
		{ match: /^\s*,\s*/, next: "nextSelector" },
		{ match: "" }
	],
	nextSelector: { match: "selector", next: "groupedSelector" },

	selector: { start: "firstSimpleSelector" },
	firstSimpleSelector: { match: "simpleSelector", next: "relativeSelector" },
	relativeSelector: [
		{ match: "combinator", next: "nextSimpleSelector" },
		{ match: "" }
	],
	combinator: { match: /^\s*(\s|[>~+])\s*/ },
	nextSimpleSelector: { match: "simpleSelector", next: "relativeSelector" },
	

	simpleSelector: { start: "firstNodeTest" },
	firstNodeTest: { match: "element_or_condition", next: "nextNodeTest" },
	nextNodeTest: [
		{ match: "condition", next: "nextNodeTest" },
		{ match: "" }
	],

	element_or_condition: { match: [ "element", "condition" ] },
	element: { match: "qualifiedName" },

	condition: { match: [ "idCondition", "classCondition", "attributeCondition" ] },

	idCondition: { match: /^#([a-zA-Z0-9_-]+)/ },
	classCondition: { match: /^\.([a-zA-Z0-9_-]+)/ },

	attributeCondition: { start: "attrStart" },
	attrStart: { match: /^\[\s*/, next: "attrName" },
	attrName: { match: "qualifiedName", next: "attrValueMatch" },
	attrValueMatch: [
		{ start: "attrMatchType" },
		{ match: "" }
	],
	attrMatchType: { match: /^([~|^$*]?=)/, next: "attrValue" },
	attrValue: { match: /^([''""]?)([^\1]*)\1/ },
	attrStop: { match: /^\s*\]/ },

	qualifiedName: { match: [ "prefixedName", "localName" ] },
	prefixedName: { match: /^(\*|[a-zA-Z0-9_-]+)\|(\*|[a-zA-Z0-9_-]+)/ },
	localName: { match: /^(\*|[a-zA-Z0-9_-]+)/ },
	ident: { match: /^([a-zA-Z0-9_-]+)/ }
}

var cf = _conditionFactory;
var sf = _selectorFactory;

var _handler = {
	stack: [],
	getResult: function() {
		return this.stack;
	},
	handleEvent: function(rule, m) {
console.log(rule);
		switch (rule) {
			case "selectorList":
				break;
			case "nextSimpleSelector":
				var rel = this.stack.pop();
				var comb = this.stack.pop();
				var sel = this.stack.pop();
				var cSel = (function(sel, comb, rel) {
					switch (comb) {
						case Selector.SAC_DESCENDANT_SELECTOR:
							return sf.createDescendantSelector(sel, rel);
						case Selector.SAC_CHILD_SELECTOR:
							return sf.createChildSelector(sel, rel);
						case Selector.SAC_DIRECT_ADJACENT_SELECTOR:
							return sf.createDirectAdjacentSelector(Node.ELEMENT_NODE, sel, rel);
						case Selector.SAC_INDIRECT_ADJACENT_SELECTOR:
							return sf.createIndirectAdjacentSelector(Node.ELEMENT_NODE, sel, rel);
					}
				})(sel, comb, rel);
				this.stack.push(cSel);
				break;
			case "combinator":
				switch (m[1]) {
					case " ": case "\t": this.stack.push(Selector.SAC_DESCENDANT_SELECTOR); break;
					case ">": this.stack.push(Selector.SAC_CHILD_SELECTOR); break;
					case "+": this.stack.push(Selector.SAC_DIRECT_ADJACENT_SELECTOR); break;
					case "~": this.stack.push(Selector.SAC_INDIRECT_ADJACENT_SELECTOR); break;
				}
				break;
			case "simpleSelector":
				break;
			case "element":
				var ns = this.stack.pop();
				var name = this.stack.pop();					
				var si = sf.createElementSelector(ns, name);
				this.stack.push(si);
				break;
			case "idCondition":
				var ci = cf.createIdCondition(m[1]);
				this.stack.push(ci);
				break;
			case "classCondition":
				var ci = cf.createClassCondition(null, m[1]);
				this.stack.push(ci);
				break;
			case "attributeCondition":
				break;
			case "qualifiedName":
				if ("localName" == m) this.stack.push(null);
				break;
			case "prefixedName":
				this.stack.push(m[2], m[1]);
				break;
			case "localName":
				this.stack.push(m[1]);
				break;
		}
	}
}


return {
	Parser: Parser,
	SelectorList: SelectorList,
	Selector: Selector,
	Specificity: Specificity,
	RelativeSelector: RelativeSelector,
	Condition: Condition
}


})();
