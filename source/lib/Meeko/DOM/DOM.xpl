<?xml version="1.0"?>
<?access-control allow="*"?>
<!--
XBL2 UI classes
Copyright 2007, Sean Hogan (http://www.meekostuff.net/)
All rights reserved
-->
<package xmlns="http://www.meekostuff.net/ns/xpl">

<class name="DOMTokenList">
	<property name="tokens" visibility="protected">
		<getter>
var element = this.boundElement;
var text = element.className;
if (!text) return [];
var strings = text.split(/\s+/);
var sorted = strings.sort();
for (var i=sorted.length-1; i>0; i--) {
	if (sorted[i] == sorted[i-1]) sorted.splice(i);
}
return sorted;
		</getter>
	</property>
	<property name="length">
		<getter>
return this.getTokens().length;
		</getter>
	</property>
	<method name="item">
		<parameter name="index"/>
		<body>
return this.getTokens()[index];
		</body>
	</method>
	<method name="has">
		<parameter name="token"/>
		<body>
return (-1 != Array.indexOf(this.getTokens(), token));
		</body>
	</method>
	<method name="add">
		<parameter name="token"/>
		<body>
var element = this.boundElement;
var tokens = this.getTokens();
if (!this.has(token)) {
	var text = element.className.replace(/\s*$/, " " + token);
	element.className = text;
}
		</body>
	</method>
	<method name="remove">
		<parameter name="token"/>
		<body>
var element = this.boundElement;
if (this.has(token)) {
	var rex, text = element.className;
	rex = RegExp("\\s+"+token+"\\s+", "g");
	text = text.replace(rex, " ");
	rex = RegExp("^\\s*"+token+"\\s+");
	text = text.replace(rex, "");
	rex = RegExp("\\s+"+token+"\\s*$");
	text = text.replace(rex, "");
	if (text == token) text = "";
	element.className = text;
}
		</body>
	</method>
	<method name="toggle">
		<parameter name="token"/>
		<body>
if (this.has(token)) this.remove(token);
else this.add(token);
		</body>
	</method>		
</class>

<class name="HTMLElement">
	<property name="classList">
		<getter>return this._classList;</getter>
	</property>
	<method name="xblBindingAttached">
		<body>
this._classList = new DOMTokenList;
this._classList.boundElement = this.boundElement;
		</body>
	</method>
</class>

<class name="EventTarget">
	<method name="addEventListener">
		<parameter name="type"/>
		<parameter name="listener"/>
		<parameter name="bCapture"/>
		<body>
			
		</body>
	</method>
	<method name="removeEventListener">
		<parameter name="type"/>
		<parameter name="listener"/>
		<parameter name="bCapture"/>
		<body>

		</body>
	</method>
	<method name="dispatchEvent">
		<parameter name="event"/>
		<body>
var element = this.boundElement;
var returnValue;
try { returnValue = element.fireEvent("on" + event.type, event); }
catch (error) { returnValue = element._elementXBL.handleEvent(event); }
return returnValue;
		</body>
	</method>
</class>

<class name="DocumentEvent">
	<method name="createEvent">
		<parameter name="eventType"/>
		<body>
var event = document.createEventObject();
return event;
		</body>
	</method>
</class>

<class name="Event">
</class>

<class name="ElementUI">
	<method name="xblBindingAttached">
		<body>
this._meta = [];
this._meta[0] = true; // enabled
this._meta[1] = false; // default
this._meta[2] = false; // checked
this._meta[3] = false; // selected
this._meta[4] = false; // valid
this._meta[5] = false; // required
this._meta[6] = 3; // data
this._meta[10] = 0; // value

this._dynamic = [];
this._dynamic[0] = false; // active
this._dynamic[1] = false; // hover
this._dynamic[2] = true; // open
		</body>
	</method>
	<method name="setDynamicState">
		<parameter name="state"/>
		<parameter name="value"/>
		<body>
var evType =
	(0 == state) ? "activestatechange" :
	(1 == state) ? "hoverstatechange" :
	(2 == state) ? "openstatechange" :
	null;
if (null == evType) throw "Invalid state in setDynamicState()";

var bVal = Boolean(value);
this._dynamic[state] = bVal;
try {
	if (document.createEvent) {
		event = document.createEvent("UIEvents");
		event.initUIEvent(evType, false, true, null, bVal);
		var rc = this.boundElement.dispatchEvent(event);
	}
	else {
		event = document.createEventObject();
		event.detail = bVal;
		var rc = this.boundElement.fireEvent(evType, event);
	}
}
catch (error) {
	event.type = evType;
	event.detail = bVal;
	this.boundElement._elementXBL.handleEvent(event);
}
		</body>
	</method>
	<method name="getDynamicState">
		<parameter name="state"/>
		<body>
return this._dynamic[state];
		</body>
	</method>
</class>

</package>

