# ExamSprint — SSC CGL Mocks

A Node.js / Express website for SSC CGL Tier I and Tier II Paper I mock tests, with a timer, section navigation, scoring, analysis, and detailed solutions.

## Run locally

```powershell
cd "C:\Users\neersing\Documents\ssc-cgl-mock-test"
& "C:\Program Files\nodejs\node.exe" .\server.js
```

Open http://localhost:3000.

## AI question generation

Copy `.env.example` to `.env` and set these server-side variables:

- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_DEPLOYMENT`
- `AZURE_OPENAI_API_VERSION` (optional; defaults to `2024-10-21`)

Do not put the Azure API key in frontend JavaScript or commit `.env`.

- Tier I runs with the verified offline practice bank if Azure is not configured.
- Tier II requires Azure AI because it needs a fresh 150-question Paper I set.

## Deploy to Render

1. Create a GitHub repository and push this folder to it.
2. In Render, choose **New → Blueprint** and connect the GitHub repository.
3. Render reads `render.yaml` and creates the web service.
4. Add the Azure OpenAI variables in Render's Environment settings.
5. Deploy. Render provides a public HTTPS URL.

The included Dockerfile runs the service with `node server.js`; it uses the platform-provided `PORT` automatically.
