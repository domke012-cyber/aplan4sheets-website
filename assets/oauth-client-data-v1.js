/* Fictional public walkthrough fixture. No live credentials. */
window.OAuthClientData = {
  "steps": [
    {
      "name": "Before you begin",
      "heading": "Have the right access and callback URL ready.",
      "caption": "A tenant security administrator creates this client. In the installed aPlan4Sheets OAuth setup wizard, copy the Redirect URI. You will use that exact address shortly. This walkthrough uses sample values only.",
      "tip": "Use your organizational account. The callback comes from your installed connector, so it can differ between deployments.",
      "duration": 5000
    },
    {
      "name": "Open Administration",
      "heading": "Start in the Anaplan navigation menu.",
      "caption": "In Anaplan, open the navigation menu at the top left and choose Administration. Then go to Security and OAuth Clients.",
      "tip": "The highlighted area shows where to act in Anaplan. Use the blue walkthrough controls to move through this example.",
      "duration": 5000
    },
    {
      "name": "Enable OAuth if prompted",
      "heading": "This is a first-use step for the tenant.",
      "caption": "If this is the first time your tenant opens OAuth Clients, choose Enable OAuth. If a client list is already visible, continue directly to New.",
      "tip": "An existing OAuth client list means you can skip the enable step.",
      "duration": 5000
    },
    {
      "name": "Name the client",
      "heading": "Choose New, then give this connection a clear name.",
      "caption": "Choose New to open the client form. Enter a name such as Aplan4Sheets. Keep the name alphanumeric so it meets Anaplan’s naming rules.",
      "tip": "Choose a name your administrators will recognize when reviewing integrations.",
      "duration": 5000
    },
    {
      "name": "Choose the grant type",
      "heading": "Select Authorization code grant.",
      "caption": "Set Type to Authorization code grant. This matches the connector’s browser sign-in flow, where the user signs in to Anaplan and returns to the connector.",
      "tip": "Use Authorization code grant for this connector configuration.",
      "duration": 5000
    },
    {
      "name": "Add the callback URL",
      "heading": "Paste the connector’s exact Redirect URI, then create.",
      "caption": "Paste the Redirect URI from the installed connector into Allowed callback URLs. Check the complete address, then choose Create client. The address shown here is only a placeholder.",
      "tip": "Do not use this example URL. Copy the complete Redirect URI from your actual setup wizard.",
      "duration": 5000
    },
    {
      "name": "Save the client credentials",
      "heading": "Keep the Client ID and Client secret together.",
      "caption": "The confirmation shows your Client ID and Client secret. Use Copy client secret and keep both values in your organization’s approved secure location. Then choose Done.",
      "tip": "The sample below is not a usable credential. Share real credentials only through your organization’s approved process.",
      "duration": 5000
    },
    {
      "name": "Continue in aPlan4Sheets",
      "heading": "Your client is ready for connector setup.",
      "caption": "The new client is enabled by default. Return to aPlan4Sheets and enter its Client ID and Client secret in the OAuth setup wizard. Continue with the linked walkthrough for validation and sign-in.",
      "tip": "Client creation is complete. The next walkthrough covers entering the credentials and connecting from Google Sheets.",
      "duration": 5000
    }
  ],
  "callback": "https://connector.example.invalid/oauth/callback",
  "clientId": "DEMO_CLIENT_ID_NOT_VALID",
  "clientName": "Aplan4Sheets"
};
