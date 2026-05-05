import { createInertiaApp } from '@inertiajs/react'
import { TooltipProvider } from '@/components/ui/tooltip'

void createInertiaApp({
  pages: "../pages",

  title: (title) => (title ? `${title} · Fielize` : "Fielize"),

  strictMode: true,

  defaults: {
    form: {
      forceIndicesArrayFormatInFormData: false,
      withAllErrors: true,
    },
    visitOptions: () => {
      return { queryStringArrayFormat: "brackets" }
    },
  },

  withApp: (app) => (
    <TooltipProvider>{app}</TooltipProvider>
  ),
}).catch((error) => {
  if (document.getElementById("app")) {
    throw error
  } else {
    console.error(
      "Missing root element.\n\n" +
      "If you see this error, it probably means you loaded Inertia.js on non-Inertia pages.\n" +
      'Consider moving <%= vite_typescript_tag "inertia.tsx" %> to the Inertia-specific layout instead.',
    )
  }
})
