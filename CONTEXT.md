# Spirit

A website for viewing, searching and managing cocktail recipes.

## Language

**Recipe**:
A named cocktail: its ingredient lines, method, photo and tags.
_Avoid_: Drink, cocktail

**Ingredient**:
A single entry in the shared catalog (e.g. "lime juice", "Campari") that recipes refer to; each exists exactly once.
_Avoid_: Item, component

**Parent Ingredient**:
The broader Ingredient an Ingredient is a kind of (e.g. "rum" is the parent of "aged rum"); each Ingredient has at most one.
_Avoid_: Category, group, type

**Ingredient type**:
The broad kind of an Ingredient, from a fixed list (spirit, liqueur, fortified wine, wine, bitters, syrup, juice, mixer, fresh, dairy & egg, pantry).
_Avoid_: Category, kind

**Recipe line**:
One ingredient within a recipe: a reference to an Ingredient plus an amount, a unit and an optional note (e.g. "fresh").
_Avoid_: Drink ingredient, recipe ingredient

**Method**:
The instructions for making a Recipe.
_Avoid_: Steps, directions, instructions

**Garnish**:
Plain-text description of how a Recipe is finished (e.g. "expressed orange peel"); not an Ingredient.
_Avoid_: Topping, decoration

**Owner notes**:
Private notes on a Recipe that only the Owner can see.
_Avoid_: Comments, private notes

**Tag**:
A label on a recipe, such as "sour" or "summer".
_Avoid_: Category

**Family Tag**:
One of the Tags naming a cocktail family (sour, daisy, highball, old fashioned, martini, flip, tiki, sparkling); a Recipe has at most one, and may have none; it sets the color and default glass of a Recipe's placeholder drawing.
_Avoid_: Category, style

**Favorite**:
A recipe the Owner has marked as a favorite.
_Avoid_: Like, liked

**Import**:
Turning a link or pasted text into a draft Recipe for the Owner to review; nothing is saved until the Owner saves it.
_Avoid_: Scrape, parse, clip

## People

**Owner**:
The single account that can sign in and edit Recipes and Ingredients; it may be shared by more than one person.
_Avoid_: Admin, user, god

**Visitor**:
Anyone browsing the site without signing in; can view and search but not edit.
_Avoid_: Guest, user, anonymous
