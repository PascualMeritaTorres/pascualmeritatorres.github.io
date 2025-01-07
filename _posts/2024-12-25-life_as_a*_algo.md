---
layout: post
title: The A* Algorithm, A Programmer's Guide to Life Decisions
date: 2025-01-07 16:40:16
description:
tags:
categories: personal, ai-related
---

<hr>

```python
def action_value(action):
    return hardness(action) - expected_regret(action)

best_action = max(possible_actions, key=action_value)
```
I was listening to a Y Combinator podcast about ['How to Make The Most Out of Your 20s'](https://www.youtube.com/watch?v=H_XMqRhLhic) the other day. They all agreed that you should tackle hard challenges while you're young. In fact they all encouraged people to "do the most hardcore thing early in your career, because you can always mellow out and take on less demanding work... but it's very hard to go the other way around". While I fundamentally agree with this, I think there's more to it. More specifically, you need to factor in whether these difficult challenges you're undertaking are going to be useful in your life. In other words, you want to minimise the regret of such actions. In fact, someone in the comments just proved me right by saying "I spent my 20s building 5 software based tech startups and projects... 0 regrets. I rather live with 'Dang, I tried and failed', than with 'What if I had done that in the past?'" This is exactly what I mean when I say that you should minimise regret while maximising the amount of challenging work you do.

Anyways, for someone with my background in computer science, this immediately reminds me of the A* algorithm.

A* uses the function ```f(n) = g(n) + h(n)``` to find optimal paths. ```g(n)``` would be how hard an action is to complete, and ```-h(n)``` would be the expected regret. Just like A* searching for the best path through a maze, we're searching for the best actions through life, trying to maximize personal growth through hard actions while minimizing future regrets.

But here's where it gets interesting. Unlike A*, we can't possibly consider every action available to us – there are infinitely many paths our lives could take at any moment. We need some way to filter these down, to focus on the choices that actually matter. And unlike a computer following a single path, we humans can (and often do) pursue multiple directions at once. Maybe that's why I find myself thinking of this more like beam search, where we keep track of several promising paths simultaneously. The trickiest part? Try putting a number on how "hard" it is to learn quantum physics versus starting a company. Or quantify the regret you might feel in ten years for not pursuing that crazy idea you had. These aren't just subjective measures – they're constantly shifting as we grow and change. What seems impossibly hard today might feel natural tomorrow, and what we think we'll regret often surprises us.

Perhaps that's the most beautiful parallel between A* and life choices: both work with approximations. A* makes its best guess about distances to the goal, just as we make our best guess about what future-us will value. We're all just working with heuristics, updating our estimates as we learn more about ourselves and the world around us.

