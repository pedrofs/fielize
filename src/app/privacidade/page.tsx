export default function PrivacyPolicy() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-6 py-12 prose prose-zinc dark:prose-invert">
      <h1>Política de privacidade · LGPD</h1>
      <p>
        A Fielize opera sob a Lei Geral de Proteção de Dados (LGPD) brasileira.
        Esta política descreve quem controla seus dados, o que coletamos, e
        como você pode exercer seus direitos a qualquer momento.
      </p>

      <h2>Co-controladoria</h2>
      <table>
        <thead>
          <tr>
            <th>Tipo de dado</th>
            <th>Controlador</th>
            <th>Operador</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Dados de conta (telefone, idioma, opt-in mestre)</td>
            <td>Fielize</td>
            <td>—</td>
          </tr>
          <tr>
            <td>Engajamento em campanhas (selos, entradas, opt-ins)</td>
            <td>CDL</td>
            <td>Fielize</td>
          </tr>
          <tr>
            <td>Mensagens WhatsApp</td>
            <td>CDL</td>
            <td>Fielize + Meta</td>
          </tr>
        </tbody>
      </table>

      <h2>Seus direitos</h2>
      <ul>
        <li>
          <strong>Acesso e portabilidade:</strong> baixe seus dados em JSON em{" "}
          <code>/account</code>.
        </li>
        <li>
          <strong>Eliminação:</strong> solicite a exclusão da conta em{" "}
          <code>/account</code>. Soft-delete imediato, purga em até 30 dias.
        </li>
        <li>
          <strong>Revogação de consentimento:</strong> apague a conta para
          revogar todos os opt-ins de uma vez. Para opt-out por CDL, fale com a
          CDL específica.
        </li>
      </ul>

      <h2>Anti-fraude</h2>
      <p>
        Tentativas de fraude (uso de localização falsa, automação para
        acumular selos sem visita real) podem resultar em desclassificação de
        sorteios e exclusão de campanhas, conforme avaliação da CDL responsável.
      </p>

      <h2>Contato</h2>
      <p>
        Para dúvidas específicas de campanha, fale com a CDL onde você
        participou. Para dúvidas sobre a plataforma, escreva para{" "}
        <a href="mailto:privacy@fielize.com">privacy@fielize.com</a>.
      </p>
    </main>
  );
}
