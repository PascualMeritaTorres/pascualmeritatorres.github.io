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

I'm currently a Research Engineer at Huawei, where I focus on Retrieval Augmented Generation (RAG) under the supervision of [Pavlos Vougiouklis](https://scholar.google.com/citations?hl=en&user=9J7YeR0AAAAJ&view_op=list_works&sortby=pubdate) and [Jeff Pan](https://scholar.google.com/citations?user=zLDAY8QAAAAJ&hl=es). If you're interested in my research perspective, you can read my thoughts on [small reasoner-like models versus large models](https://pascualmeritatorres.github.io/blog/2024/small_vs_big_models/) and their approaches to parametric knowledge.

Prior to joining Huawei, I earned my Master's degree in AI from The University of Edinburgh. My research there focused on improving the efficiency of Vision Transformers through token pooling techniques, achieving up to 1.4x faster inference times while maintaining comparable accuracy. This work was conducted under the guidance of [Edoardo Ponti](https://scholar.google.ca/citations?user=tklL2q0AAAAJ&hl=en) and [Piotr Nawrot](https://scholar.google.com/citations?user=9wrNHUQAAAAJ&hl=en). During my time in Edinburgh, I also co-founded and was president of [Edinburgh AI](https://edinburghai.org/), the university's AI society. With now over 400 members, talks by the likes of DeepMind, and a yearly conference where students can present their work, it has grown into a thriving community that I am proud to have started.

Before that, I earned a BSc in Computer Science from King's College London. My thesis focused on 'Similarity-based Music Recommendation Systems', where I employed various CNNs to recommend songs similar to a given input (primarily to enhance my music production skills). My official supervisor was [Jeroen Keppens](https://scholar.google.co.uk/citations?user=6uEtmfoAAAAJ&hl=de), while I also received valuable guidance from my unofficial advisors, [Timothy Greer (Amazon Music)](https://www.linkedin.com/in/timothy-greer-ph-d-28630671/) and [Minz Won (Suno)](https://scholar.google.com/citations?user=x5rArQMAAAAJ&hl=en).

Overall, I would say I am driven by projects that have a significant, tangible impact. As a classically trained musician, my initial projects centered around music recommendations, as it was an area that directly affected me and my friends. Now, with a more mature understanding of the AI landscape, I am passionate about topics such as enhancing the efficiency of LLMs at inference time (code coming soon), [analyzing LLM activations to detect hallucinations](https://github.com/tberm/mlp_cw4?tab=readme-ov-file), and improving the question-answering performance of LLMs by improving their retrieval capabilities (paper submitted to ACL 2024).

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
