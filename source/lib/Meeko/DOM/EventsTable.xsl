<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">

<xsl:output method="text"/>

<xsl:template match="table">
	<xsl:apply-templates select="tbody"/>
</xsl:template>

<xsl:template match="tbody">
[
	<xsl:for-each select="tr">{ type: "<xsl:value-of select="td[1]"/>", bubbles: <xsl:value-of select="td[2]"/>, cancelable: <xsl:value-of select="td[3]"/>, module: "<xsl:value-of select="td[5]"/>" },
	</xsl:for-each>
]
</xsl:template>

</xsl:stylesheet>
