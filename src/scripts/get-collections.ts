import puppeteer from "puppeteer";
import fs from "fs";

async function scrapeAndClickButton(url: string) {
  console.log(`\n--- Iniciando scraping en la URL: ${url} ---`);

  const browser = await puppeteer.launch({
    headless: "shell",
  });
  console.log(">>> Navegador lanzado en modo headless.");

  const page = await browser.newPage();
  console.log(">>> Nueva página creada en el navegador.");

  await page.goto(url);
  console.log(`>>> Página cargada: ${url}`);

  const products = await page.evaluate(() => {
    console.log(
      ">>> Evaluando elementos de la página para extraer productos..."
    );

    const items: any[] = [];
    document
      .querySelectorAll(".productGrid .product .product-item .card")
      .forEach((element: any) => {
        const title = element.querySelector(".card-title")?.innerText;
        const price = element.querySelector(".price-item--regular")
          ?.innerText as string;

        const images = element.querySelectorAll(".card-product__wrapper img");

        const imageUrl =
          images.length > 0 ? images[0]?.getAttribute("data-srcset") || "" : "";

        const imageUrl2 =
          images.length > 1
            ? images[1]?.getAttribute("data-srcset") || null
            : null;

        items.push({
          title,
          price: price.replace(/Desde/g, "").trim(),
          image_url_1: `https://${imageUrl
            .split(",//")
            [imageUrl.split(",//").length - 1].replace(/940w|1880w/g, "")
            .trim()}`,
          image_url_2: imageUrl2
            ? `https://${imageUrl2
                .split(",//")
                [imageUrl2.split(",//").length - 1].replace(/940w|1880w/g, "")
                .trim()}`
            : null,
        });
      });
    console.log(">>> Extracción de productos completa.");
    return items;
  });

  console.log("<<< Cerrando el navegador.");
  await browser.close();

  console.log(`<<< Se han obtenido ${products.length} productos de ${url}.\n`);
  return products;
}

const collections = [
  {
    url: "https://donaleche.com/collections/avena",
    name: "avena",
  },
  {
    url: "https://donaleche.com/collections/kumis",
    name: "kumis",
  },
  {
    url: "https://donaleche.com/collections/leches",
    name: "leches",
  },
  {
    url: "https://donaleche.com/collections/quesos",
    name: "quesos",
  },
  {
    url: "https://donaleche.com/collections/yogurt",
    name: "yogurt",
  },
];

async function main() {
  console.log(
    "\n=== Iniciando el proceso de scraping para todas las colecciones... ===\n"
  );

  const products = await Promise.all(
    collections.map(async (collection) => {
      console.log(`\n--- Procesando colección: ${collection.name} ---`);

      const scrapedProducts = await scrapeAndClickButton(collection.url);

      const filePath = `./src/donaleche/donaleche_collection_${collection.name}.json`;
      console.log(
        `>>> Guardando productos de la colección ${collection.name} en ${filePath}`
      );
      fs.writeFileSync(filePath, JSON.stringify(scrapedProducts, null, 2));

      return {
        name: collection.name,
        products_count: scrapedProducts.length,
        products: scrapedProducts,
      };
    })
  );

  let allProducts: any = [];

  products.map((product) => {
    allProducts = [...allProducts, ...product.products];
  });

  const allFilePath = "./src/donaleche/donaleche_all_collections.json";
  console.log(`\n>>> Guardando todos los productos en ${allFilePath}`);
  fs.writeFileSync(allFilePath, JSON.stringify(allProducts, null, 2));

  console.log("\n=== Resumen de todas las colecciones ===");
  console.log(
    products.map((product) => {
      return {
        name: product.name,
        products_count: product.products_count,
      };
    })
  );

  console.log(
    `\n=== Total de productos en todas las colecciones: ${allProducts.length} ===\n`
  );
}

main().catch((error) => {
  console.error("\n*** Error durante la ejecución: ***", error, "\n");
});
