# {{PROJECT_NAME}}

<!-- Shield by brAInam: ye file Claude ki rule book hai. Har session mein Claude ise padhta hai. -->

## Project ke baare mein
- Kya bana rahe hain: {{WHAT}}
- Kaun use karega: {{WHO}}
- Kahan live hoga: {{WHERE}}
- Stack: {{STACK}}
- Student ki bhasha: {{LANGUAGE}} (Claude hamesha isi bhasha mein, simple shabdon mein samjhaye)

## Roz ke 5 rules (Shield by brAInam)
1. **Ek baar mein ek chhota change.** Ek kaam poora karo, check karo, phir agla.
2. **Pehle plan.** Code likhne se pehle Claude 3-5 line mein simple plan batayega aur student ki "haan" lega.
3. **Baad mein tests + review.** Har change ke baad tests chalenge aur `/code-review` hoga.
4. **Khud try karo.** Student khud app khol kar change check karega. Sirf Claude ke "ho gaya" par bharosa nahi.
5. **Sab theek ho tabhi live karo.** Live karne ke liye hamesha `/brainam-shield:ship` use karo.

## Claude ke liye zaroori baatein
- `.env` aur koi bhi password / API key kabhi git mein, chat mein ya code mein na daalo. Keys `.env` mein rahengi, aur `.env.example` mein sirf khaali naam.
- Kuch bhi delete karne, database badalne ya live karne se pehle student se poochho.
- Har naye feature ke saath kam se kam ek test likho.
- Galti ho to chhupao mat: seedha batao kya toota aur kaise theek hoga.

## Commands
- App chalana: `{{RUN_CMD}}`
- Tests chalana: `{{TEST_CMD}}`

## Rollback (kuch toot jaye to wapas kaise jayein)
- Pichhla change wapas lena (safe, history rehti hai): `git revert HEAD` phir `git push`
- Kisi purane version ko dekhna: `git log --oneline` se commit chuno, `git checkout <commit>` (dekhne ke baad `git checkout main`)
- Hosting par wapas jana: {{HOSTING_ROLLBACK}}
- Database backup: {{DB_BACKUP}}

## Error monitoring
- Error monitoring: {{MONITORING}}
