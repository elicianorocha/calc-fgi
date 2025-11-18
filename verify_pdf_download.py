
import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        try:
            # Iniciar um servidor web simples para servir os arquivos locais
            # Isso é necessário para evitar problemas de CORS com file://
            # O servidor será iniciado em segundo plano
            server_process = await asyncio.create_subprocess_shell(
                'python3 -m http.server 8000',
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            await asyncio.sleep(2) # Dar um tempo para o servidor iniciar

            await page.goto("http://localhost:8000/index.html")

            # Preencher o formulário
            await page.fill("#client-cnpj", "06.990.590/0001-23")
            await page.press("#client-cnpj", "Tab")
            await asyncio.sleep(2) # Esperar a API do CNPJ retornar

            await page.fill("#proposal-date", "2024-01-15")
            await page.fill("#loan-amount", "100000,00")
            await page.fill("#grace-period", "180")
            await page.fill("#base-date", "15")
            await page.fill("#installments", "36")
            await page.fill("#contract-rate", "15,50")
            await page.fill("#cdi-rate", "11,25")
            await page.fill("#tac-amount", "3500,00")
            await page.click("#toggle-insurance-btn") # Ativar seguro

            # Clicar em simular
            await page.click("#calculate-btn")
            await expect(page.locator("#results-area")).to_be_visible()

            print("Simulação concluída. Resultados visíveis.")

            # Esperar o evento de download ser acionado após clicar no botão
            async with page.expect_download() as download_info:
                await page.click("#export-pdf-btn")

            download = await download_info.value

            # Verificar se o download foi iniciado
            if download:
                print(f"PDF download iniciado com sucesso: {download.suggested_filename}")
                await download.save_as("simulacao_final.pdf")
                print("Arquivo PDF salvo.")
            else:
                raise Exception("O download do PDF não foi iniciado.")

            # Tirar uma captura de tela para verificação visual final
            await page.screenshot(path="final_fix_verification.png")
            print("Captura de tela final realizada.")

        except Exception as e:
            print(f"Ocorreu um erro durante o teste: {e}")
            await page.screenshot(path="error_final_fix.png")
        finally:
            await browser.close()
            # Encerrar o servidor
            if 'server_process' in locals() and server_process.returncode is None:
                server_process.terminate()
                await server_process.wait()
            print("Teste finalizado.")

if __name__ == "__main__":
    asyncio.run(main())
