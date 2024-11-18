import puppeteer from "puppeteer";
import slug from "slug";
import donaleche_all_collections from "../donaleche/donaleche_all_collections.json";
import fs from "fs";

const all_products = donaleche_all_collections;

async function getProduct(url: string) {
  console.log(`\n=== Iniciando scraping del producto en la URL: ${url} ===`);

  const browser = await puppeteer.launch({
    headless: "shell",
  });
  const page = await browser.newPage();

  await page.goto(url);
  console.log(`\n>>> Página del producto cargada: ${url}`);

  const product = await page.evaluate(() => {
    console.log("\n--- Extrayendo información del producto...");

    const title =
      document.querySelector("h1.productView-title span")?.textContent || "";
    const title_desc =
      document
        .querySelector(".productView-desc")
        ?.textContent?.replace(/\n/g, "")
        .trim() || "";
    const collection =
      document
        .querySelector(
          ".productView-info .productView-info-item .productView-info-value"
        )
        ?.textContent?.replace(/\n/g, "")
        .trim() || "";
    const price = document.querySelector("span.price-item")?.textContent;
    const description =
      document.querySelector(".toggle-content p")?.textContent;

    const weights = document.querySelectorAll(".productView-variants input");
    const weight_1 = weights[0]?.getAttribute("value") || null;
    const weight_2 = weights[1]?.getAttribute("value") || null;

    return {
      title,
      weight_1,
      weight_2,
      title_desc,
      collection,
      price,
      description,
    };
  });

  console.log(`\n<<< Scraping completado: ${product.title} >>>\n`);
  await browser.close();

  return {
    ...product,
    slug: slug(product.title),
  };
}

async function main() {
  const blockSize = 1;
  let allResults: any = [];

  console.log(
    "\n*** Iniciando el proceso de scraping para todos los productos... ***\n"
  );
  for (let i = 0; i < all_products.length; i += blockSize) {
    const productBlock = all_products.slice(i, i + blockSize);
    console.log(
      `\n--- Procesando bloque de productos: ${i + 1} - ${i + blockSize} ---\n`
    );

    const blockResults = await Promise.all(
      productBlock.map(async (product) => {
        console.log(`\n>>> Scraping del producto: ${product.title} <<<`);

        const p = await getProduct(
          `https://donaleche.com/products/${
            slug(product.title) === "leche-uht-slim-semidescremada"
              ? "leche-uht-slim"
              : slug(product.title)
          }`
        );

        return {
          ...p,
          image_url_1: product.image_url_1,
          image_url_2: product.image_url_2,
        };
      })
    );

    allResults = allResults.concat(blockResults);
  }

  const outputPath = "./src/donaleche/donaleche_products.json";
  fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
  console.log(
    `\n=== Todos los productos se han guardado exitosamente en ${outputPath}. Total de productos: ${allResults.length} ===\n`
  );
}

main().catch((error) => {
  console.error("\n*** Error durante la ejecución: ***", error, "\n");
});
