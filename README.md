# Ascend

A personal health and habits tracker. One daily plan for food and calories, exercise, habits, reminders, medications and sleep, saved in your own account. The interface is in Spanish and the food database focuses on foods common in Colombia.

I started Ascend to keep track of my own health and build better daily habits. I designed the product and built it together with AI tools (Claude), improving it version by version.

## What it does

**Daily plan.** Meals and calories, water, exercise, sleep, medications and reminders.

**Progress.** Health records and trends over time.

**Habits and game layer.** Editable habits with streaks, plus levels and XP, achievements, boss challenges, friends, rankings and clans.

**AI assistant.** Helps with nutrition and habits. It can propose daily goals and new habits, and the user applies them with one tap.

**Privacy.** A privacy policy and explicit consent before any health data is stored.

## How it works

**Front end.** Vanilla JavaScript, HTML and CSS, designed mobile first.

**Back end.** Supabase for authentication and the database, designed so each account only sees its own data.

**AI.** A Vercel serverless function (api/chat.js) calls the Claude API. The API key lives only in server environment variables and never reaches the browser.

**Hosting.** Vercel.

## Safety and privacy decisions

**Not a doctor.** The assistant never diagnoses and never suggests changing or stopping medications.

**Minors.** For users under 18 it never proposes calorie deficits, fasting, restrictive diets or supplements.

**Eating disorders.** If it detects warning signs, it stops giving numbers and points the user to a professional and a trusted person.

**Abuse limits.** Requests must come from a signed-in session of the app itself, with a daily limit per user and for the whole app.

**No conversation logs.** Server logs never store the content of conversations, because they can contain health data.

## Run it yourself

Create a Supabase project and put its URL and publishable key in config.js. In Vercel, set ANTHROPIC_API_KEY (required) and, optionally, ASCEND_AI_MODEL, SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY. The daily quota logic lives in a Supabase function called ai_take.

## Status

Under active development. Ascend is a personal project and does not replace medical advice.

## En español

Ascend reúne en un solo lugar tu comida y calorías, ejercicio, hábitos, recordatorios, medicamentos y sueño. La hice para cuidar mi propia salud, con un asistente de IA y reglas de seguridad pensadas para menores de edad.
