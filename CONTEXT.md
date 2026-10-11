# Spirit

A website for viewing, searching and managing cocktail recipes.

## Language

**Recipe**:
A named cocktail: its ingredient lines, method, photo and tags.
_Avoid_: Drink, cocktail

**Ingredient**:
A single entry in the shared catalog (e.g. "lime juice", "Campari") that recipes refer to; each exists exactly once.
_Avoid_: Item, component

**Recipe line**:
One ingredient within a recipe: a reference to an Ingredient plus an amount, a unit and an optional note (e.g. "fresh").
_Avoid_: Drink ingredient, recipe ingredient

**Tag**:
A label on a recipe, such as "sour" or "tiki".
_Avoid_: Category

**Favorite**:
A recipe the Owner has marked as a favorite.
_Avoid_: Like, liked

## People

**Owner**:
The single person who can sign in and edit recipes and ingredients.
_Avoid_: Admin, user, god

**Visitor**:
Anyone browsing the site without signing in; can view and search but not edit.
_Avoid_: Guest, user, anonymous
