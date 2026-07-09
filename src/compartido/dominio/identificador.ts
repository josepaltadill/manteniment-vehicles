export type Identificador = Readonly<{
  valor: string;
}>;

export function crearIdentificador(valor: string): Identificador {
  const valorNormalizado = valor.trim();

  if (valorNormalizado.length === 0) {
    throw new Error('El identificador no puede estar vacío.');
  }

  return Object.freeze({ valor: valorNormalizado });
}
