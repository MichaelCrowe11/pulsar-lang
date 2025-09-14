# Dealer Logic GM Pitch Scripts & Objection Handling

## Two-Minute Opener (Verbatim)

> **Agent:** "Thanks for the time. In Arizona we're seeing most stores miss 10–25% of inbound calls during peaks or after-hours. Dealer Logic answers on the first ring 24/7, routes to sales/service/parts, books service directly in your scheduler, and pushes qualified sales leads to your CRM via ADF or API. If we lift your answer rate from, say, 80% to 98% and convert even a fraction, the math is compelling. Would you like me to run your numbers and show the 30-day pilot plan?"

If they say **yes** → run `calcROI` with quick assumptions and read back the deltas, then propose a pilot start date and call `bookMeeting`.

## Objection Library

### "We already have an answering service."
**Response:** "Great—keep the number. We sit on your SIP trunk and answer on the first ring, then book directly in your service scheduler and create structured sales leads. That's the difference: fewer voicemails, more set appointments. Let's compare your current answer rate and average hold time to our targets."

### "Compliance/privacy worries."
**Response:** "We announce recording, honor DNC on request, require SMS opt-in, and never take cards—payments go through your cashier or a secure link. We can run Zero Retention if you prefer."

### "Integration risk."
**Response:** "Zero rip-and-replace: keep your numbers, we connect by SIP; if APIs aren't ready, we use ADF email so data still hits CRM day one. There's a full rollback plan."

### "Team adoption."
**Response:** "We reduce hold time and after-hours gaps; warm transfers keep your people in the loop. We'll pilot with clear guardrails and review call examples weekly."

### "Spanish callers?"
**Response:** "Yes—bilingual with natural Spanish voices and scripts."

### "Price."
**Response:** "We price a 30-day pilot as a flat per-store fee or per-minute—whichever lands cheaper based on your volume. If we don't hit the agreed KPIs, you don't roll forward."

## Pilot Close Script

> "Let's test this the low-risk way. 30 days, answer rate ≥ 98%, hold time down ~80%, and at least 30% of service bookings self-served. I can reserve a kickoff for **{{DATE_OPTION_1}} at {{TIME_1}}** or **{{DATE_OPTION_2}} at {{TIME_2}}**. Which works? I'll send the one-pager and pilot SOW right now."

Then trigger `bookMeeting`, `generateProposal`, and `sendDeck`.

## Spanish Opener

> "Hablo español si prefiere. Ayudamos a su concesionario a contestar todas las llamadas al primer timbre, agendar servicio y captar clientes calificados—¿quiere que calculemos el ROI en dos minutos?"

## Key Metrics to Emphasize

- **Answer Rate Target:** 98%+ (from current ~80%)
- **Hold Time Reduction:** ~80% decrease
- **Service Self-Booking:** ≥30% of calls
- **After-Hours Coverage:** 100% captured leads
- **First Ring Answer:** <2 seconds
- **Pilot Duration:** 30 days
- **Risk:** Pay only if KPIs met

## ROI Talking Points

### Recovered Calls Calculation
- Monthly inbound calls × (1 - current answer rate) = missed calls
- Missed calls × AI capture rate = recovered opportunities
- Recovered opportunities × conversion rates = incremental revenue

### Service Department Impact
- More appointments booked after-hours
- Reduced hold abandonment
- Higher customer satisfaction scores
- Increased RO count and revenue

### Sales Department Impact
- Zero missed leads during rush
- Structured data capture
- Improved lead qualification
- Better handoff to BDC team

## Implementation Timeline

1. **Day 0:** SIP trunk connection, DID mapping
2. **Day 1:** CRM integration testing, service scheduler API
3. **Day 2:** Staff training, warm transfer testing
4. **Day 3-5:** Soft launch with monitoring
5. **Week 2:** Full production, daily reports
6. **Week 4:** KPI review and optimization

## Closing Questions to Ask

1. "What's your current monthly call volume?"
2. "Which CRM system are you using?"
3. "What service scheduler—Xtime, myKaarma, or other?"
4. "How many Spanish-speaking customers do you serve?"
5. "What's your biggest pain point—missed calls, hold times, or after-hours coverage?"

## Follow-Up Cadence

- **Immediately:** Send deck + proposal
- **Day 1:** Email confirmation with pilot checklist
- **Day 3:** Call to address questions
- **Day 7:** Final decision call
- **Day 10:** Implementation kickoff (if approved)