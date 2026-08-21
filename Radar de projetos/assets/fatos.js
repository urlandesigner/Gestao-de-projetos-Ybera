/* GERADO POR tools/sync.mjs — NÃO EDITE À MÃO.
   Fatos vindos do Azure DevOps: produtos (nome = título do Epic), o
   trimestre em curso e "O essencial" (resumo), calculados a cada rodada, e
   os itens (Features, uma por projeto do Radar). Todo texto editorial POR
   ITEM (título legível, why, about, result, healthNote) continua em
   prosa.js, indexado pelo mesmo id — mas o nome de produto e "O essencial"
   não são mais escritos à mão em lugar nenhum.
   Para regerar:  ADO_PAT=xxx node tools/sync.mjs
   Gerado em: 2026-08-21T13:19:30.402Z */
const RADAR_FATOS = {
  "geradoEm": "2026-08-21T13:19:30.402Z",
  "quarter": {
    "label": "Q3 2026",
    "start": "2026-07-01",
    "end": "2026-09-30"
  },
  "resumo": [
    {
      "tag": {
        "pt": "Projetos",
        "en": "Projects"
      },
      "pt": "31 projetos em 5 produtos: 14 em curso, 12 planejados, 5 concluídos.",
      "en": "31 projects across 5 products: 14 in flight, 12 planned, 5 shipped."
    },
    {
      "tag": {
        "pt": "Entregas",
        "en": "Shipped"
      },
      "pt": "2 entregas no mês de agosto.",
      "en": "2 shipped in August."
    },
    {
      "tag": {
        "pt": "Atenção",
        "en": "Attention"
      },
      "pt": "Nada travado.",
      "en": "Nothing blocked."
    }
  ],
  "produtos": [
    {
      "id": "49280",
      "name": "Ecommerce Europa / Crossborder USA"
    },
    {
      "id": "49282",
      "name": "ERP — Ordoro | Salesforce Rootstock"
    },
    {
      "id": "49283",
      "name": "Hub de Produtos"
    },
    {
      "id": "49284",
      "name": "IA de Recomendação / Quiz AI Ybera"
    },
    {
      "id": "49290",
      "name": "Loja Clube USA"
    },
    {
      "id": "49291",
      "name": "Loja da Influencer"
    },
    {
      "id": "49294",
      "name": "Loja Interna USA/MX/CL/PA"
    },
    {
      "id": "49296",
      "name": "Marketplace/Amazon"
    },
    {
      "id": "49301",
      "name": "Tema Global Shopify"
    },
    {
      "id": "49302",
      "name": "Ybera Reviews / API de Reviews"
    }
  ],
  "epics": [
    {
      "id": 32829,
      "azureTitle": "Melhoria da Experiência do Hair Quiz Ybera USA",
      "track": "49290",
      "start": "2025-09-17",
      "end": "2025-09-26",
      "status": "next",
      "estadoCru": "To Do",
      "health": null,
      "shipped": null,
      "owner": "Isadora Brunner",
      "demands": []
    },
    {
      "id": 36764,
      "azureTitle": "Lybera Shop - V2 Chile",
      "track": "49294",
      "start": null,
      "end": null,
      "status": "next",
      "estadoCru": "To Do",
      "health": null,
      "shipped": null,
      "owner": "Isadora Brunner",
      "demands": []
    },
    {
      "id": 36765,
      "azureTitle": "Lybera Shop - V2 - Panamá",
      "track": "49294",
      "start": null,
      "end": null,
      "status": "next",
      "estadoCru": "To Do",
      "health": null,
      "shipped": null,
      "owner": "Isadora Brunner",
      "demands": []
    },
    {
      "id": 40097,
      "azureTitle": "Alteração do Provedor Logístico Padrão para Pedidos da Loja Interna - Chile",
      "track": "49294",
      "start": null,
      "end": null,
      "status": "next",
      "estadoCru": "To Do",
      "health": null,
      "shipped": null,
      "owner": "Isadora Brunner",
      "demands": []
    },
    {
      "id": 40767,
      "azureTitle": "[Conversão imediata] Diagnóstico de Conversão e Otimização da Jornada de Compra",
      "track": "49290",
      "start": null,
      "end": null,
      "status": "done",
      "estadoCru": "Done",
      "health": null,
      "shipped": "2026-04",
      "owner": "Urlan Dipre",
      "demands": []
    },
    {
      "id": 40798,
      "azureTitle": "[Estratégia e retenção] Diagnóstico de Conversão e Otimização da Jornada de Compra",
      "track": "49290",
      "start": null,
      "end": null,
      "status": "next",
      "estadoCru": "To Do",
      "health": null,
      "shipped": null,
      "owner": "Isadora Brunner",
      "demands": []
    },
    {
      "id": 40995,
      "azureTitle": "Liberar kit primeira compra Panamá e Chile",
      "track": "49294",
      "start": null,
      "end": null,
      "status": "doing",
      "estadoCru": "Ready for Dev",
      "health": null,
      "shipped": null,
      "owner": "Isadora Brunner",
      "demands": []
    },
    {
      "id": 41922,
      "azureTitle": "[EUA] Diagnóstico e Priorização de Débito Técnico do Tema Global",
      "track": "49290",
      "start": null,
      "end": null,
      "status": "doing",
      "estadoCru": "In Progress",
      "health": null,
      "shipped": null,
      "owner": "Urlan Dipre",
      "demands": []
    },
    {
      "id": 42103,
      "azureTitle": "[LYBERA SHOP] Acesso ao produto pelo título na listagem",
      "track": "49294",
      "start": null,
      "end": null,
      "status": "doing",
      "estadoCru": "In Progress",
      "health": null,
      "shipped": null,
      "owner": "Isadora Brunner",
      "demands": []
    },
    {
      "id": 42137,
      "azureTitle": "[TEMPLATE] Evolução do Tema Global da nova loja Ybera.us",
      "track": "49290",
      "start": null,
      "end": null,
      "status": "doing",
      "estadoCru": "Ready for Dev",
      "health": null,
      "shipped": null,
      "owner": "Urlan Dipre",
      "demands": []
    },
    {
      "id": 42422,
      "azureTitle": "[YBERA CLUB CHILE] Integração Mercado Pago",
      "track": "49294",
      "start": null,
      "end": null,
      "status": "next",
      "estadoCru": "Grooming",
      "health": null,
      "shipped": null,
      "owner": "Isadora Brunner",
      "demands": []
    },
    {
      "id": 42883,
      "azureTitle": "[EUA] Subscriptions",
      "track": "49290",
      "start": null,
      "end": null,
      "status": "next",
      "estadoCru": "Prototype",
      "health": null,
      "shipped": null,
      "owner": "Urlan Dipre",
      "demands": []
    },
    {
      "id": 42887,
      "azureTitle": "[Cart Drawer] Ajuste de Exibição de Brindes Progressivos no Cart Drawer",
      "track": "49290",
      "start": null,
      "end": null,
      "status": "done",
      "estadoCru": "Done",
      "health": null,
      "shipped": "2026-07",
      "owner": "Isadora Brunner",
      "demands": []
    },
    {
      "id": 43165,
      "azureTitle": "[EUA] Bundles Inteligentes Shopify",
      "track": "49290",
      "start": null,
      "end": null,
      "status": "doing",
      "estadoCru": "Ready for Dev",
      "health": null,
      "shipped": null,
      "owner": "Urlan Dipre",
      "demands": []
    },
    {
      "id": 43320,
      "azureTitle": "[EUA] Discovery Integração Amazon - Shopify Marketplace Connector - Rootstock",
      "track": "49296",
      "start": null,
      "end": null,
      "status": "doing",
      "estadoCru": "Ready",
      "health": null,
      "shipped": null,
      "owner": "Urlan Dipre",
      "demands": []
    },
    {
      "id": 43389,
      "azureTitle": "[GLOBAL] Clear Cart Inteligente na Cart Drawer",
      "track": "49290",
      "start": null,
      "end": null,
      "status": "done",
      "estadoCru": "Done",
      "health": null,
      "shipped": "2026-07",
      "owner": "Urlan Dipre",
      "demands": []
    },
    {
      "id": 43587,
      "azureTitle": "[GLOBAL] BOGO via MetaFields",
      "track": "49290",
      "start": null,
      "end": null,
      "status": "doing",
      "estadoCru": "Ready",
      "health": null,
      "shipped": null,
      "owner": "Isadora Brunner",
      "demands": []
    },
    {
      "id": 43726,
      "azureTitle": "Implementação de Quiz de Recomendação de Produtos",
      "track": "49284",
      "start": null,
      "end": null,
      "status": "next",
      "estadoCru": "To Do",
      "health": null,
      "shipped": null,
      "owner": "Daniele de Paula",
      "demands": []
    },
    {
      "id": 43753,
      "azureTitle": "[EUA] Pesquisa Técnica e Benchmark de Plataforma de Loyalty",
      "track": "49290",
      "start": null,
      "end": null,
      "status": "next",
      "estadoCru": "Grooming",
      "health": null,
      "shipped": null,
      "owner": "Urlan Dipre",
      "demands": []
    },
    {
      "id": 44271,
      "azureTitle": "[EUA] Nova PDP Global",
      "track": "49290",
      "start": null,
      "end": null,
      "status": "done",
      "estadoCru": "Done",
      "health": null,
      "shipped": "2026-08",
      "owner": "Urlan Dipre",
      "demands": []
    },
    {
      "id": 44272,
      "azureTitle": "[EUA] Evolução dos Componentes da PDP",
      "track": "49290",
      "start": null,
      "end": null,
      "status": "done",
      "estadoCru": "Done",
      "health": null,
      "shipped": "2026-08",
      "owner": "Urlan Dipre",
      "demands": []
    },
    {
      "id": 45272,
      "azureTitle": "[EUA] Nova Home",
      "track": "49290",
      "start": null,
      "end": null,
      "status": "doing",
      "estadoCru": "In Progress",
      "health": null,
      "shipped": null,
      "owner": "Urlan Dipre",
      "demands": []
    },
    {
      "id": 45421,
      "azureTitle": "[GLOBAL] Governança do Tema Global",
      "track": "49301",
      "start": null,
      "end": null,
      "status": "doing",
      "estadoCru": "Ready",
      "health": null,
      "shipped": null,
      "owner": "Urlan Dipre",
      "demands": []
    },
    {
      "id": 45424,
      "azureTitle": "[GLOBAL] Discovery de Plataforma de Orquestração Shopify",
      "track": "49290",
      "start": null,
      "end": null,
      "status": "doing",
      "estadoCru": "Testing",
      "health": null,
      "shipped": null,
      "owner": "Urlan Dipre",
      "demands": []
    },
    {
      "id": 45723,
      "azureTitle": "[EUA] Refatoração da Experiência do Cart Drawer no Mobile",
      "track": "49290",
      "start": null,
      "end": null,
      "status": "next",
      "estadoCru": "To Do",
      "health": null,
      "shipped": null,
      "owner": "Urlan Dipre",
      "demands": []
    },
    {
      "id": 46260,
      "azureTitle": "[EUA] Produto Único para Ads e Influenciadores",
      "track": "49290",
      "start": null,
      "end": null,
      "status": "doing",
      "estadoCru": "In Progress",
      "health": null,
      "shipped": null,
      "owner": "Urlan Dipre",
      "demands": []
    },
    {
      "id": 46262,
      "azureTitle": "[EUA] Publicar Apenas Produtos com Estoque no Google Merchant Center",
      "track": "49290",
      "start": null,
      "end": null,
      "status": "doing",
      "estadoCru": "Ready",
      "health": null,
      "shipped": null,
      "owner": "Urlan Dipre",
      "demands": []
    },
    {
      "id": 46668,
      "azureTitle": "Lybera Shop - Rollout EUA, Panamá e Chile",
      "track": "49294",
      "start": null,
      "end": null,
      "status": "next",
      "estadoCru": "Grooming",
      "health": null,
      "shipped": null,
      "owner": "Isadora Brunner",
      "demands": []
    },
    {
      "id": 48588,
      "azureTitle": "[EUA] Ajustes Compliance Google Shopping/Ads",
      "track": "49290",
      "start": null,
      "end": null,
      "status": "doing",
      "estadoCru": "In Progress",
      "health": null,
      "shipped": null,
      "owner": "Urlan Dipre",
      "demands": []
    },
    {
      "id": 48811,
      "azureTitle": "[YBERA CLUB PANAMÁ] | Discovery Técnico | Viabilidade de Integração TILOPAY no YBERACLUB",
      "track": "49294",
      "start": null,
      "end": null,
      "status": "next",
      "estadoCru": "To Do",
      "health": null,
      "shipped": null,
      "owner": "Isadora Brunner",
      "demands": []
    },
    {
      "id": 49617,
      "azureTitle": "Migração da Loja Interna USA do Ordoro para Shopify | Produção",
      "track": "49294",
      "start": null,
      "end": null,
      "status": "doing",
      "estadoCru": "In Progress",
      "health": null,
      "shipped": null,
      "owner": "Isadora Brunner",
      "demands": []
    }
  ]
};
