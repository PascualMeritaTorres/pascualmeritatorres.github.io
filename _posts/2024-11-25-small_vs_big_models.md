---
layout: post
title: Small reasoner-like models vs. large knowledge-dense models
date: 2024-11-25 16:40:16
description:
tags:
categories: ai-related
---

_in progress.. come back in a few weeks_

<hr>

I am currently working on the literature review, but in the mean time, this is what I roughly want to cover:

1. **Small reasoner-like models**. Motivated by Retrieval Augmented Generation (RAG), I envision a pipeline where there is an information seeking step, and a generation step. The generation step is performed by a smaller model which just focuses on reasoning over data. The two steps are coupled, creating a loop where the reasoner can ask for an extra retrieval step (indefinitely in theory). This kind of pipeline already exists, but I believe it is not yet fully exploited. I will expand more on why I believe this is the case in the article.

2. **Large knowledge-dense models**. Motivated by (1) the on-going research on updating the parametric knowledge of models, (2) the success of increasing the context window of LLMs, and (3) the trend of making LLMs larger and larger, I envision a pipeline where models can be constantly updated with new data (to the minute), massive amounts of data can be put in-context, and the model itself can store a lot of information in its parameters. In this pipeline, there is no need for external knowledge bases, as the model itself can act as a knowledge base and can be updated every day or multiple times a day. All the private information about a specific user/system can be put in-context.

3. **Hybrid models**. There are multiple ways to combine the two worlds/paradigms that I mentioned above. This is where the main body of my literature review will be focused on, as it is the part that I know the least about. An obvious way of combining it is through traditional RAG, where a (small or large) model is used to select which documents to retrieve, and then a large model is used to reason over the retrieved documents. Another (more experimental) way that I can think of is to have a sparse mixture of experts, where there is a small router model that is used to select which expert to use. Each expert can either be a small reasoner-like model or a large model. Another hybrid model that I can think of is a large model that has a reasoner-like module or system embedded in it. This is where all the recent research on reasoning is headed towards. Research such as Star, and Quiet Star (any research focused on scaling inference time compute). I will expand more on this in the article.
