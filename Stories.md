# Stories and Future Work

This document tracks planned features, improvements, and technical debt for the AI Packing List Generator project.

## Current Sprint

### In Progress
- [ ] Complete LLM streaming integration
- [ ] Add real-time tool invocation display in chat interface

### Backlog
- [ ] Implement actual LLM API integration (OpenAI/Anthropic)
- [ ] Add conversation persistence to database
- [ ] Create checklist CRUD operations

## Future Features

### Weather Integration
- [ ] Support multiple weather API providers
- [ ] Add weather icons and visual forecast display
- [ ] Include weather alerts and warnings
- [ ] Historical weather data analysis

### Packing Algorithm
- [ ] Smart packing suggestions based on:
  - Trip duration
  - Weather forecast
  - Destination type (beach, city, mountain, etc.)
  - Activities planned
- [ ] Learn from user preferences
- [ ] Seasonal packing templates

### PDF Generation
- [ ] Professional PDF styling with branded header/footer
- [ ] Multiple template options
- [ ] Print-optimized layouts
- [ ] QR code for mobile access

### Multi-day Planning
- [ ] Day-by-day itinerary integration
- [ ] Activity-specific packing sections
- [ ] Calendar integration
- [ ] Reminder notifications

### Collaboration
- [ ] Share checklists with travel companions
- [ ] Real-time collaborative editing
- [ ] Comments and suggestions
- [ ] Group packing coordination

### Analytics & Learning
- [ ] Tool call analytics dashboard
- [ ] Performance metrics for tool execution
- [ ] LLM response quality tracking
- [ ] A/B testing for prompts
- [ ] Cost tracking for LLM usage

### Mobile Experience
- [ ] Progressive Web App (PWA)
- [ ] Offline mode
- [ ] Mobile-optimized interface
- [ ] Push notifications

## Technical Debt

### Testing
- [ ] Increase test coverage to 80%+
- [ ] Add E2E tests with Playwright
- [ ] Component testing for React components
- [ ] Integration tests for LLM tool flow

### Performance
- [ ] Optimize bundle size
- [ ] Implement caching strategy
- [ ] Database query optimization
- [ ] Image optimization

### Security
- [ ] Rate limiting for API calls
- [ ] Input validation and sanitization
- [ ] API key rotation
- [ ] Audit logging

### Developer Experience
- [ ] Add Storybook for component development
- [ ] Improve error messages and logging
- [ ] Add debug mode for tool invocations
- [ ] Create development seed data scripts

## Completed

### Phase 1: Foundation ✅
- [x] Next.js project setup
- [x] TypeScript configuration
- [x] ESLint setup with Next.js and TypeScript
- [x] Vitest testing infrastructure
- [x] Drizzle ORM with local SQLite
- [x] CI pipeline with GitHub Actions (lint, test, build)

### Phase 2: Core Features ✅
- [x] Basic chat interface
- [x] LLM tool registry system
- [x] Tool executor with timing
- [x] Weather API mock implementation
- [x] PDF generation scaffold
- [x] Test helpers and fixtures

---

## Contributing

When picking up a story:
1. Move it to "In Progress"
2. Create a feature branch
3. Follow TDD workflow from CLAUDE.md
4. Write tests first, then implementation
5. Ensure all tests pass
6. Submit PR with test coverage

## Notes

- Prioritize user-facing features over infrastructure
- Always consider mobile experience
- Keep bundle size under 500KB
- Maintain >80% test coverage
- Document all LLM prompts and tool definitions
