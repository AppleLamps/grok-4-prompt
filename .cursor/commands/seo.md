You are an expert SEO engineer and Next.js developer. Review the entire GROKIFY_PROMPT v2.0 codebase and implement comprehensive SEO improvements for maximum Google visibility.

## AUDIT & ANALYSIS

1. **Current State Assessment**
   - Review all pages (pages/, components/, public/)
   - Identify missing meta tags, structured data, and SEO elements
   - Check Open Graph and Twitter Card implementations
   - Analyze current heading hierarchy (H1, H2, H3 usage)
   - Review image alt text coverage
   - Check for missing canonical tags and robots.txt

2. **Core SEO Elements to Implement**
   - Dynamic meta tags (title, description) for all pages using next/head
   - Open Graph tags for social media sharing
   - Twitter Card meta tags
   - Structured JSON-LD schema (Organization, WebApplication, FAQPage)
   - Canonical URLs
   - robots.txt file
   - sitemap.xml generation

3. **Page-Level Optimizations**
   - Create a dedicated SEO metadata config (src/config/seo.js)
   - Implement proper H1/H2/H3 heading hierarchy on index.js
   - Add descriptive alt text to all images
   - Optimize component descriptions with SEO-friendly copy
   - Add schema.org markup for the tool/application

4. **Technical SEO**
   - Check Next.js image optimization with next/image
   - Verify font loading strategy (JetBrains Mono) for Core Web Vitals
   - Ensure mobile responsiveness (test with 375px viewport)
   - Add viewport and character set meta tags
   - Implement proper error handling pages (404, 500)

5. **Content SEO**
   - Target keywords: "AI prompt generator", "image prompt maker", "GROK IMAGINE PROMPTS", "prompt engineering tool"
   - Create FAQ schema for common questions
   - Add breadcrumb schema
   - Optimize README.md for SEO
   - Create descriptive feature descriptions

6. **Performance SEO**
   - Analyze and report Core Web Vitals metrics
   - Optimize CSS and JavaScript bundles
   - Implement lazy loading for non-critical components
   - Add preload/prefetch hints for critical resources
   - Review and optimize image sizes and formats

## IMPLEMENTATION TASKS

Create/modify these files with SEO improvements:

- [ ] src/config/seo.js - Centralized SEO configuration
- [ ] src/pages/_document.js - Global HTML document setup
- [ ] src/pages/index.js - Enhanced with proper structure
- [ ] public/robots.txt - Search engine crawling rules
- [ ] public/sitemap.xml or src/pages/sitemap.xml - Dynamic sitemap
- [ ] next.config.js - Add redirects, headers, and SEO configs
- [ ] Update components with proper ARIA labels and alt text
- [ ] Add schema.json files for structured data

## ADDITIONAL RECOMMENDATIONS

- Set up Google Search Console integration guide
- Create meta description for each section
- Add breadcrumb navigation with schema markup
- Implement internal linking strategy
- Add Open Graph images (1200x630px)
- Create a privacy policy and terms of service page
- Add structured data for the API endpoint

## DELIVERABLES

1. Complete all SEO implementations
2. Generate a detailed SEO report with before/after metrics
3. Provide Google Search Console setup instructions
4. List all implemented keywords and their page locations
5. Create a SEO maintenance checklist for future updates

Start with the audit, then prioritize implementations by impact. Make sure all changes are production-ready and don't break existing functionality.
