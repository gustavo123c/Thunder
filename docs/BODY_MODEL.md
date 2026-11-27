# Corpo 3D do Check-up

O Check-up mostra um corpo 3D (MakeHuman, licença CC0) que gira no eixo vertical e é
dividido em zonas de dor de corredor. Este guia explica como gerar ou trocar os modelos
`assets/models/body-male.glb` e `assets/models/body-female.glb`.

## Como o app usa o modelo

- Cada zona é um **material** chamado `zone_<região>_<lado>` (ex.: `zone_it_band_left`,
  `zone_lower_back_center`). O app identifica e colore as zonas pelo nome
  (`src/domain/health/body-zones.ts`); todo o resto usa o material `body` e não é tocável.
- Zonas: `foot`, `ankle`, `achilles`, `shin`, `calf`, `knee`, `quadriceps`, `hamstring`,
  `it_band`, `hip` (esquerdo e direito) e `lower_back` (centro). O tronco superior e os braços
  são marcados pela lista "Escolher pela lista".
- Lados são os do corpo do personagem (esquerdo = `+X` no Blender).
- Compressão: `weld` + `quantize` (KHR_mesh_quantization) com gltf-transform. **Não use
  Draco nem meshopt**: precisam de WebAssembly, que o Hermes (React Native) não tem.
- Se o 3D não puder ser exibido (sem WebGL, falha ao carregar), o app volta ao mapa 2D.

## Opção A — MPFB2 no Blender (recomendado)

1. Instale o **Blender 4.2 ou mais novo** e o add-on **MPFB2** (Edit → Preferences →
   Get Extensions → procure "MPFB").
2. No painel lateral (N) → aba MPFB → **New human** → "From scratch". Ajuste sexo, idade
   (jovem adulto), músculo e peso. **Não adicione roupas, cabelo nem esqueleto** — o script
   só usa a malha do corpo.
3. Selecione a malha do corpo (objeto com os grupos de vértices `body` e `joint-*`).
4. Aba Scripting → abra `scripts/blender/split_body_zones.py` → ajuste `--out` se quiser e
   clique em **Run Script**. Ou, sem interface:

   ```bash
   blender humano.blend -b -P scripts/blender/split_body_zones.py -- \
     --out assets/models/body-male.glb
   ```

   O script cria as zonas, aplica uma subdivisão (`--subdivide 0` desliga), exporta o .glb e
   comprime com `npx @gltf-transform/cli` (precisa de Node). `--no-compress` pula a compressão.

5. Repita para o corpo feminino (`body-female.glb`).

O script falha com uma mensagem clara se alguma zona ficar vazia (pose incomum, malha sem os
grupos `joint-*`).

## Opção B — sem o add-on (Blender 4.0+, como foi gerado aqui)

`build_basemesh.py` monta o humano direto dos arquivos de dados CC0 do MPFB2 (malha base +
targets "jovem adulto" + um pouco de músculo), sem instalar o add-on:

```bash
git clone --depth 1 https://github.com/makehumancommunity/mpfb2.git
blender -b -P scripts/blender/build_basemesh.py -P scripts/blender/split_body_zones.py -- \
  --mpfb-data mpfb2/src/mpfb/data --sex male --out assets/models/body-male.glb
blender -b -P scripts/blender/build_basemesh.py -P scripts/blender/split_body_zones.py -- \
  --mpfb-data mpfb2/src/mpfb/data --sex female --out assets/models/body-female.glb
```

(Clone com `GIT_LFS_SKIP_SMUDGE=1` se o Git LFS não estiver instalado; os dados usados não
estão no LFS.) O Blender precisa do módulo `numpy` para exportar glTF
(`apt install python3-numpy` no Linux).

## Opção C — MakeHuman 1.2 (aplicativo)

Os grupos `joint-*` só existem no MPFB2. Pelo MakeHuman 1.2 dá para exportar
(Files → Export → **FBX** ou **OBJ**, unidade **metros**, sem roupas), importar no Blender e
então criar os materiais `zone_*` à mão (Edit Mode → selecionar faces → atribuir material).
É bem mais trabalhoso; prefira as opções A ou B.

## Licença

A malha base e os targets oficiais do MakeHuman/MPFB2 são **CC0** (domínio público): podem
ser usados no app sem atribuição. Assets de terceiros (roupas, peles, cabelos da comunidade)
têm licenças próprias — não os inclua no modelo.
