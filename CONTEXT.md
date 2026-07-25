# Weather Blanket

A tool that turns a year of daily maximum temperatures into a knitting or crochet pattern. Users input a location, the app fetches historical weather data, and generates a visual design and written instructions for a temperature blanket or scarf.

## Language

**Design**:
The visual representation of the weather data as coloured bands. What the user sees and tweaks on screen.
_Anot_: Preview, visualization, chart

**Pattern**:
The written instructions for knitting or crochet — rows of stitches to follow with yarn in hand. Generated from the design once the user is satisfied.
_Anot_: Instructions, rows, recipe

**Band**:
A horizontal stripe in the design, representing one day's maximum temperature. Each band has a single colour.
_Anot_: Stripe, row (in design context)

**Row**:
A line of stitches in the pattern, corresponding to one band. The term takes precedence in written instructions.
_Anot_: Stitch row, pass

**Palette**:
The finite set of yarn colours available to the knitter. Typically 8–15 colours. Each palette colour covers a temperature range.
_Anot_: Colour set, yarn colours, shades

**Colour Key**:
The rule mapping temperature ranges to palette colours. Displayed as a discrete bar with labelled ranges. Auto-generated from the data's actual min/max, user-adjustable.
_Anot_: Legend, colour map, scale

**Colour**:
One specific yarn shade from the palette.
_Anot_: Shade, hue, yarn colour

**Colour Increment**:
The temperature step between palette colours. Auto-calculated to produce ~10–12 colours from the data range. Common values: 4°, 5°, or 6°C.
_Anot_: Step, interval, range size

**Stitch Count**:
The number of stitches per row. In v1 this is a simple placeholder (default 50). In v2, derived from a tension swatch and desired blanket width.
_Anot_: Cast-on, width

**Date Range**:
The period of weather data to fetch. Default: calendar year (1 Jan – 31 Dec). Configurable in v2.
_Anot_: Time period, year range

**Location**:
The geographic coordinates (latitude/longitude) where weather data is sourced.
_Anot_: Coordinates, place, position

**Gauge** (v2):
The relationship between stitches and physical distance (stitches per inch). Derived from a tension swatch. Bridges the digital design to a real object.
_Anot_: Tension, swatch gauge
