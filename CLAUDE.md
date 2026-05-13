# V2X-Dashboard

## Custom Skills

This project has two custom skills defined in `.agents/skills/`:

### shadcn (auto-triggered)

Manages shadcn/ui components and projects. **Not user-invocable** — triggers automatically when:
- Working with shadcn components or `components.json`
- Adding/updating/fixing component code
- Applying presets or adjusting styling

**Key commands:**
```bash
npx shadcn@latest info                    # Project context
npx shadcn@latest add <component>         # Add components
npx shadcn@latest search -q "<query>"     # Find components
npx shadcn@latest docs <component>        # Component docs
npx shadcn@latest preset resolve          # Current preset
npx shadcn@latest apply <preset-code>     # Apply preset
```

**Critical rules:** Use semantic colors (`bg-primary`, not raw hex), compose components (don't reinvent), use `cn()` for conditional classes, and use `gap-*` for spacing (not `space-x-*`/`space-y-*`). See `.agents/skills/shadcn/SKILL.md` for full rules.

### ui-ux-pro-max (invoke when needed)

UI/UX design intelligence: 50+ styles, 161 color palettes, 57 font pairings, 99 UX guidelines, 25 chart types.

**Use when:**
- Designing new pages or components
- Choosing colors, typography, layouts, or styles
- Reviewing UI for accessibility/usability
- Optimizing interface quality

**Typical workflow:**
```bash
# 1. Get complete design system (start here)
python3 skills/ui-ux-pro-max/scripts/search.py "<product_type> <keywords>" --design-system -p "Project Name"

# 2. Deep-dive into specific domain (optional)
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <ux|style|color|typography|chart> -n 5

# 3. Get stack-specific guidelines
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack react
```

See `.agents/skills/ui-ux-pro-max/SKILL.md` for detailed domains, rule priorities, and pre-delivery checklists.

## Project Context

- **Stack:** React (shadcn/ui components), Node.js backend
- **Database:** PostgreSQL (kepler_db)
- **Key features:** Traffic controllers, SPaT data visualization, NTCIP integration
