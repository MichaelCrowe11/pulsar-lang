# Dealer Logic - ElevenLabs Deployment Checklist

## Pre-Deployment Requirements

### 1. Prerequisites (Complete Before On-Site)
- [ ] **Phone System**
  - [ ] PBX/DID list obtained
  - [ ] SIP trunk access configured
  - [ ] Transfer targets identified:
    - Sales Desk: _______________
    - Service BDC: ______________
    - Parts Counter: ____________
    - Cashier: __________________

- [ ] **CRM Integration**
  - [ ] CRM Type: _______________ (VinSolutions/DealerSocket/Other)
  - [ ] ADF inbox email: _______________
  - [ ] API credentials obtained (if applicable)

- [ ] **Service Scheduler**
  - [ ] System: _______________ (Xtime/myKaarma/Other)
  - [ ] API URL: _______________
  - [ ] API Key: _______________

- [ ] **Compliance Settings**
  - [ ] Recording disclosure script approved
  - [ ] SMS opt-in wording confirmed
  - [ ] DNC process documented
  - [ ] Data retention preference (Zero Retention: Yes/No)

- [ ] **Language Support**
  - [ ] Spanish volume assessed
  - [ ] EN/ES voices selected

## Day-0 Configuration

### 2. System Setup
- [ ] **DID Mapping**
  - [ ] Main Number → Reception Agent
  - [ ] Sales Number → Sales Agent
  - [ ] Service Number → Service Agent
  - [ ] Parts Number → Parts Agent

- [ ] **After-Hours Configuration**
  - [ ] Timezone set (America/Phoenix)
  - [ ] Business hours configured:
    - Mon-Fri: _______________
    - Saturday: ______________
    - Sunday: ________________

- [ ] **Knowledge Base Loaded**
  - [ ] Dealer name and address
  - [ ] Business hours for each department
  - [ ] Website URL
  - [ ] Policies (no quotes, no payments)

- [ ] **Webhook Configuration**
  - [ ] Post-call webhook enabled
  - [ ] JSON receipt tested
  - [ ] ADF email to CRM inbox verified

- [ ] **Tools Connected**
  - [ ] createLead
  - [ ] scheduleService
  - [ ] checkRecall
  - [ ] getInventory
  - [ ] sendSMS

- [ ] **Transfer Numbers Set**
  - [ ] Sales desk tested
  - [ ] Service BDC tested
  - [ ] Parts counter tested
  - [ ] Cashier tested
  - [ ] Warm transfer functionality verified

## Go-Live Testing (First 2 Hours)

### 3. Function Tests
- [ ] **Sales Test**
  - [ ] Lead capture → ADF appears in CRM
  - [ ] Test drive booking confirmed
  - [ ] SMS consent captured

- [ ] **Service Test**
  - [ ] Appointment booking → Slot appears in scheduler
  - [ ] Recall check functioning
  - [ ] Transportation preferences captured

- [ ] **Parts Test**
  - [ ] Parts quote generated
  - [ ] Email/SMS confirmation sent

- [ ] **Service Status Test**
  - [ ] RO lookup functioning
  - [ ] Payment link successfully sent

- [ ] **Spanish Language Test**
  - [ ] Greeting in Spanish
  - [ ] Intent capture
  - [ ] Booking completion
  - [ ] Transfer to Spanish speaker

- [ ] **Fail-Safe Test**
  - [ ] Unknown intent handling
  - [ ] Warm transfer on confusion
  - [ ] After-hours message capture

## KPIs to Monitor (First 30 Days)

### 4. Performance Metrics
- [ ] Answer rate ≥ 98% (first ring)
- [ ] Time-to-answer < 2 seconds
- [ ] Sales: +25-40% qualified lead capture
- [ ] Test-drive show rate tracking
- [ ] Service: ≥30% bookings self-serve
- [ ] Hold time reduction: 80%
- [ ] Compliance: 100% recording disclosure
- [ ] DNC requests: 0 missed

## Training & Documentation

### 5. Staff Training
- [ ] **BDC Team**
  - [ ] Quick reference sheet provided
  - [ ] When to request agent transfer
  - [ ] Escalation matrix reviewed

- [ ] **Cashier Team**
  - [ ] Payment link process explained
  - [ ] No card info to AI rule understood

- [ ] **Management**
  - [ ] Daily digest recipients configured:
    - GM: _______________
    - GSM: ______________
    - Service Director: _______________
    - Parts Manager: _______________

## Cutover & Rollback Plan

### 6. Implementation
- [ ] **Cutover**
  - [ ] Low-traffic hour selected: _______________
  - [ ] Legacy IVR kept as fallback (Day 1)
  - [ ] Gradual transition plan confirmed

- [ ] **Rollback Plan**
  - [ ] DID routing reversion documented
  - [ ] SIP provider contact: _______________
  - [ ] Manager notification list prepared

## Reference Materials

### 7. Key Documents
- [ ] ADF/XML template ready
- [ ] SMS templates configured
- [ ] Transfer extension list
- [ ] Appointment policies documented
- [ ] Warranty/recall language approved

## Sign-Off

- **Dealer Principal**: _______________ Date: _______________
- **GM**: _______________ Date: _______________
- **IT Manager**: _______________ Date: _______________
- **Implementation Lead**: _______________ Date: _______________

---

## Notes
- Replace all {{PLACEHOLDER}} values before deployment
- Voice IDs must be consistent across all agents
- Enable zero_retention_mode if dealer requires no data retention
- Test all integrations in staging environment first