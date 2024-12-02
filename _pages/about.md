---
layout: about
title: about
permalink: /
subtitle: A bit about me...
profile:
  align: right
  image: prof_pic_tinyfied.jpg
  image_circular: false # crops the image to make it circular
  more_info:

news: false # includes a list of news items
selected_papers: false # includes a list of papers marked as "selected={true}"
social: true # includes social icons at the bottom of the page
latest_posts: false
---

I'm currently a Research Engineer at Huawei, working on Retrieval Augmented Generation (RAG) under the supervision of [Pavlos Vougiouklis](https://scholar.google.com/citations?hl=en&user=9J7YeR0AAAAJ&view_op=list_works&sortby=pubdate) and [Jeff Pan](https://scholar.google.com/citations?user=zLDAY8QAAAAJ&hl=es). Here are some of my thoughts about [small reasoner-like models vs. large models](https://pascualmeritatorres.github.io/blog/2024/small_vs_big_models/) with vast amounts of parametric knowledge.

Previously, I completed my Master's degree in AI at The University of Edinburgh. There, I explored how 'Retrofitting Vision Transformers via Token Pooling' can increase inference-time efficiency by up to 1.4x with only minimal impact on accuracy. My work was supervised by [Edoardo Ponti](https://scholar.google.ca/citations?user=tklL2q0AAAAJ&hl=en) and [Piotr Nawrot](https://scholar.google.com/citations?user=9wrNHUQAAAAJ&hl=en).

Before that, I completed a BSc in Computer Science at King's College London. My thesis was on ['Similarity-based Music Recommendation Systems'](https://github.com/PascualMeritaTorres/Deep-Learning-Music-Recommendation-System), where I used a variety of CNNs to suggest similar songs to an input song (mainly so I could improve my music production skills). Officially, my supervisor was [Jeroen Keppens](https://scholar.google.co.uk/citations?user=6uEtmfoAAAAJ&hl=de), but my unofficial advisors were [Timothy Greer (Amazon Music)](https://scholar.google.com/citations?user=sD2tSQ4AAAAJ&hl=en) and [Minz Won (Suno)](https://scholar.google.com/citations?user=x5rArQMAAAAJ&hl=en).

In general I would say I am mainly motivated by projects with a large tangible impact. As a classically trained musician, some of my first AI-related projects focused on music recommendation, as it was something that directly had an impact on the lives of me and my friends. Now that I am slightly more mature and better understand the bigger picture of the AI landscape, I am moved by topics such as making LLMs more efficient at inference time (code up soon), [analysing LLM activations to detect hallucinations](https://github.com/tberm/mlp_cw4?tab=readme-ov-file), and improving LLMs question-answering performance by improving the retrieval step in RAG (paper up soon).

<br/>
 
```python
def get_my_email():
    email = "geoffreyhinton@gmail.com"
    if not_a_robot:
        name = "Pascual Merita Torres"
        parts = name.lower().split()
        email = f"{parts[0][0]}{''.join(parts[1:])}@gmail.com"
    return email
```
