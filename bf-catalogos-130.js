/* BlackFlow 1.30.0 — catálogos prontos por segmento.

   Ninguém assina um sistema para passar a primeira semana digitando
   tabela de preço e nome de medicamento. Então cada segmento chega com o
   seu catálogo montado, e na primeira entrada o profissional decide:
   mantém como está, ou monta do jeito dele.

   O que cada segmento recebe, e por quê:

   BIOMEDICINA ESTÉTICA, com receituário.
     A Resolução CFBM nº 241/2014 autoriza o biomédico com habilitação em
     Biomedicina Estética a prescrever toxina botulínica, preenchedores,
     substâncias de intradermoterapia nutróficas, venotróficas e
     lipolíticas, vitaminas, minerais, aminoácidos, enzimas, fitoterápicos,
     peelings e fármacos de uso tópico. Duas travas vêm da própria
     resolução: o PMMA está fora dos preenchimentos, pelo artigo 5º, e a
     tretinoína vai até 0,5% para uso domiciliar e até 10% apenas para uso
     em clínica, pelo artigo 6º.

   ODONTOLOGIA, com receituário.
     O artigo 6º da Lei nº 5.081/1966 dá ao cirurgião-dentista a
     prescrição no âmbito da odontologia. O catálogo traz analgésicos,
     anti-inflamatórios, corticoides, antibióticos, antissépticos,
     antifúngicos, antivirais e flúor, com posologia sugerida. Fora dele
     ficam os medicamentos das listas da Portaria SVS/MS nº 344/1998, que
     exigem receituário de controle especial numerado.

   PODOLOGIA, sem receituário.
     O artigo 61 do Código de Ética dos Profissionais de Podologia veda ao
     podólogo prescrever medicamentos. Então a podologia recebe catálogo
     de procedimentos e os documentos que ela assina: orientação de
     cuidados, orientação para pessoa com diabetes, encaminhamento médico
     e termos de consentimento e de imagem.

   A posologia dos injetáveis fica em branco de propósito. Diluição,
   unidades por ponto e volume dependem do produto, da região e da pessoa,
   e número inventado em catálogo vira erro repetido em escala. */
(function () {
  'use strict';
  if (window.__bfCatalogos) return;
  window.__bfCatalogos = true;

  var CAT = {"biomedicina": {"rotulo": "Biomedicina Estética", "base": "Resolução CFBM nº 241/2014", "prescreve": true, "grupos": [{"g": "Toxina botulínica tipo A", "via": "Intramuscular", "obs": "Reconstituir conforme a bula. A diluição e as unidades por ponto são definidas pelo profissional, caso a caso.", "itens": [{"n": "Toxina botulínica tipo A 100 U", "a": "Frasco-ampola, pó liofilizado"}, {"n": "Toxina botulínica tipo A 50 U", "a": "Frasco-ampola, pó liofilizado"}, {"n": "Toxina botulínica tipo A 200 U", "a": "Frasco-ampola, pó liofilizado"}, {"n": "Toxina botulínica tipo A 300 U", "a": "Frasco-ampola, pó liofilizado"}, {"n": "Toxina botulínica tipo A 500 U", "a": "Frasco-ampola, pó liofilizado"}]}, {"g": "Preenchedores de ácido hialurônico", "via": "Intradérmica, subcutânea ou supraperiosteal", "obs": "Polimetilmetacrilato está fora da competência do biomédico pelo artigo 5º da Resolução CFBM nº 241/2014.", "itens": [{"n": "Ácido hialurônico reticulado 20 mg/ml", "a": "Seringa preenchida 1 ml"}, {"n": "Ácido hialurônico reticulado 23 mg/ml", "a": "Seringa preenchida 1 ml"}, {"n": "Ácido hialurônico reticulado 25 mg/ml", "a": "Seringa preenchida 1 ml"}, {"n": "Ácido hialurônico não reticulado, skinbooster", "a": "Seringa preenchida 1 ml ou 2 ml"}, {"n": "Ácido hialurônico de alta coesividade", "a": "Seringa preenchida 1 ml"}]}, {"g": "Bioestimuladores de colágeno", "via": "Subcutânea ou supraperiosteal", "obs": "Correlatos de uso injetável registrados na Anvisa, artigo 5º da resolução.", "itens": [{"n": "Hidroxiapatita de cálcio", "a": "Seringa preenchida 1,5 ml"}, {"n": "Ácido poli-L-lático", "a": "Frasco-ampola, pó liofilizado"}, {"n": "Policaprolactona", "a": "Frasco-ampola, pó liofilizado"}, {"n": "Polidesoxirribonucleotídeo, PDRN", "a": "Seringa preenchida 2 ml"}]}, {"g": "Intradermoterapia nutrófica", "via": "Intradérmica ou subcutânea", "obs": "Vitaminas, minerais e aminoácidos, artigo 5º da resolução.", "itens": [{"n": "Cianocobalamina, vitamina B12", "a": "Ampola 1 ml"}, {"n": "Riboflavina, vitamina B2", "a": "Ampola 2 ml"}, {"n": "Tiamina, vitamina B1", "a": "Ampola 1 ml"}, {"n": "Piridoxina, vitamina B6", "a": "Ampola 2 ml"}, {"n": "Complexo B", "a": "Ampola 2 ml"}, {"n": "Ácido ascórbico, vitamina C", "a": "Ampola 5 ml"}, {"n": "Biotina", "a": "Ampola 2 ml"}, {"n": "Silício orgânico", "a": "Ampola 5 ml"}, {"n": "L-carnitina", "a": "Ampola 5 ml"}, {"n": "Ácido hialurônico não reticulado para hidratação", "a": "Ampola 2 ml"}]}, {"g": "Intradermoterapia venotrófica", "via": "Intradérmica", "obs": "", "itens": [{"n": "Rutina", "a": "Ampola 5 ml"}, {"n": "Extrato de castanha-da-índia", "a": "Ampola 5 ml"}, {"n": "Ginkgo biloba", "a": "Ampola 5 ml"}, {"n": "Extrato de centella asiática", "a": "Ampola 5 ml"}]}, {"g": "Intradermoterapia lipolítica", "via": "Subcutânea", "obs": "", "itens": [{"n": "Fosfatidilcolina com desoxicolato de sódio", "a": "Ampola 5 ml"}, {"n": "Cafeína", "a": "Ampola 5 ml"}, {"n": "L-carnitina", "a": "Ampola 5 ml"}, {"n": "Extrato de alcachofra", "a": "Ampola 5 ml"}]}, {"g": "Enzimas", "via": "Intradérmica ou subcutânea", "obs": "", "itens": [{"n": "Hialuronidase 2.000 UTR", "a": "Frasco-ampola, pó liofilizado"}, {"n": "Colagenase", "a": "Frasco-ampola"}, {"n": "Lipase", "a": "Frasco-ampola"}]}, {"g": "Peelings químicos e enzimáticos", "via": "Tópica, uso em clínica", "obs": "Tretinoína: até 0,5% para uso domiciliar e até 10% somente para uso em clínica, artigo 6º da resolução.", "itens": [{"n": "Ácido glicólico 30% a 70%", "a": "Solução ou gel"}, {"n": "Ácido salicílico 20% a 30%", "a": "Solução"}, {"n": "Ácido mandélico 30% a 50%", "a": "Solução"}, {"n": "Ácido tricloroacético 10% a 35%", "a": "Solução"}, {"n": "Ácido retinoico, tretinoína", "a": "Creme ou solução"}, {"n": "Ácido kójico", "a": "Creme"}, {"n": "Ácido ferúlico", "a": "Solução"}, {"n": "Peeling enzimático de papaína e bromelina", "a": "Creme"}]}, {"g": "Nutrientes e fitoterápicos de uso oral", "via": "Oral", "obs": "Artigo 5º da resolução: vitaminas, minerais, aminoácidos, bioflavonoides, enzimas e lactobacilos.", "itens": [{"n": "Colágeno hidrolisado peptídeo bioativo", "a": "Sachê 10 g", "p": "1 sachê ao dia, dissolvido em água, por 90 dias"}, {"n": "Biotina 5 mg", "a": "Cápsula", "p": "1 cápsula ao dia, por 90 dias"}, {"n": "Vitamina C 500 mg", "a": "Cápsula", "p": "1 cápsula ao dia, após o almoço"}, {"n": "Vitamina D 2.000 UI", "a": "Cápsula", "p": "1 cápsula ao dia, após a refeição"}, {"n": "Zinco quelato 30 mg", "a": "Cápsula", "p": "1 cápsula ao dia"}, {"n": "Complexo B", "a": "Cápsula", "p": "1 cápsula ao dia, pela manhã"}, {"n": "Lactobacilos, probiótico", "a": "Sachê", "p": "1 sachê ao dia, em jejum"}, {"n": "Ômega 3, EPA e DHA", "a": "Cápsula", "p": "1 cápsula duas vezes ao dia, com as refeições"}]}, {"g": "Uso tópico domiciliar", "via": "Tópica", "obs": "Formulações magistrais ou de referência, artigo 6º da resolução.", "itens": [{"n": "Protetor solar FPS 50 com cor", "a": "Creme 50 g", "p": "Aplicar pela manhã e reaplicar a cada 3 horas"}, {"n": "Vitamina C 10% a 20%", "a": "Sérum 30 ml", "p": "Aplicar pela manhã, no rosto limpo e seco"}, {"n": "Niacinamida 5%", "a": "Sérum 30 ml", "p": "Aplicar à noite"}, {"n": "Ácido hialurônico tópico", "a": "Sérum 30 ml", "p": "Aplicar pela manhã e à noite"}, {"n": "Tretinoína 0,025% a 0,05%", "a": "Creme 30 g", "p": "Aplicar à noite, iniciando três vezes por semana"}, {"n": "Clareador com ácido kójico e arbutin", "a": "Creme 30 g", "p": "Aplicar à noite, na área a clarear"}]}], "bloqueados": [{"n": "Polimetilmetacrilato, PMMA", "motivo": "O artigo 5º da Resolução CFBM nº 241/2014 exclui expressamente o PMMA dos preenchimentos que o biomédico pode prescrever."}], "limites": [{"termo": "tretinoína", "dom": 0.5, "clinica": 10, "texto": "Tretinoína: até 0,5% para uso domiciliar e até 10% apenas para uso exclusivo em clínica, pelo artigo 6º da Resolução CFBM nº 241/2014."}], "procedimentos": [{"n": "Toxina botulínica, terço superior", "p": 0, "d": 60}, {"n": "Toxina botulínica, face completa", "p": 0, "d": 75}, {"n": "Preenchimento labial", "p": 0, "d": 60}, {"n": "Preenchimento de olheira", "p": 0, "d": 60}, {"n": "Harmonização facial", "p": 0, "d": 120}, {"n": "Bioestimulador de colágeno, face", "p": 0, "d": 90}, {"n": "Skinbooster facial", "p": 0, "d": 60}, {"n": "Microagulhamento facial", "p": 0, "d": 60}, {"n": "Peeling químico facial", "p": 0, "d": 45}, {"n": "Limpeza de pele profunda", "p": 0, "d": 75}, {"n": "Intradermoterapia capilar", "p": 0, "d": 40}, {"n": "Intradermoterapia para gordura localizada", "p": 0, "d": 45}, {"n": "Avaliação e plano de tratamento", "p": 0, "d": 45}, {"n": "Aplicação de enzimas", "p": 0, "d": 45}], "documentos": [{"t": "Termo de consentimento para procedimento estético injetável", "c": "Declaro que fui informado, em linguagem que compreendi, sobre o procedimento estético a ser realizado, a substância que será utilizada, a técnica, o número de sessões previsto, o resultado esperado, o caráter temporário do resultado e os riscos envolvidos, entre eles edema, equimose, dor local, assimetria, reação alérgica e nódulos.\n\nFui informado de que o resultado varia de pessoa para pessoa e de que retoques podem ser necessários.\n\nInformei meu histórico de saúde, alergias, medicamentos em uso, gestação e amamentação, e declaro que as informações prestadas são verdadeiras.\n\nTive a oportunidade de fazer perguntas e todas foram respondidas.\n\nAutorizo a realização do procedimento."}, {"t": "Orientações antes do procedimento", "c": "Antes do seu procedimento:\n\n1. Evitar bebida alcoólica nas 24 horas anteriores.\n2. Avisar sobre uso de anticoagulante, anti-inflamatório, suplemento de ômega 3, ginkgo biloba ou vitamina E.\n3. Avisar sobre qualquer quadro infeccioso ativo, inclusive herpes.\n4. Comparecer sem maquiagem na área a ser tratada.\n5. Avisar se estiver gestante ou amamentando.\n6. Avisar sobre procedimentos estéticos realizados nos últimos seis meses na mesma área."}, {"t": "Orientações após o procedimento", "c": "Depois do seu procedimento:\n\n1. Não massagear, apertar nem deitar sobre a área tratada nas primeiras 4 horas.\n2. Evitar exercício físico intenso, sauna, piscina e exposição ao sol por 48 horas.\n3. Não consumir bebida alcoólica por 24 horas.\n4. Aplicar compressa fria se houver inchaço, por 10 minutos, várias vezes ao dia.\n5. Manter a cabeça elevada ao dormir na primeira noite.\n6. Usar protetor solar diariamente.\n7. Entrar em contato com a clínica se aparecer dor intensa, mudança de cor da pele, palidez, ferida ou febre.\n8. Comparecer à sessão de retorno na data combinada."}, {"t": "Ficha de registro do produto aplicado", "c": "Registro do produto utilizado no atendimento.\n\nProduto:\nFabricante:\nLote:\nValidade:\nQuantidade utilizada:\nRegiões aplicadas:\nTécnica:\nIntercorrências:\n\nEste registro fica arquivado no prontuário, conforme a boa prática de rastreabilidade de produtos injetáveis."}, {"t": "Encaminhamento para avaliação médica", "c": "Encaminho a pessoa acima para avaliação médica.\n\nMotivo do encaminhamento:\n\nAchados observados durante o atendimento:\n\nFico à disposição para prestar as informações que forem necessárias."}]}, "odontologia": {"rotulo": "Odontologia", "base": "Lei nº 5.081/1966, artigo 6º", "prescreve": true, "grupos": [{"g": "Analgésicos", "via": "Oral", "obs": "", "itens": [{"n": "Dipirona sódica 500 mg", "a": "Comprimido", "p": "1 comprimido de 6 em 6 horas, se dor, por até 3 dias"}, {"n": "Dipirona sódica 1 g", "a": "Comprimido", "p": "1 comprimido de 6 em 6 horas, se dor, por até 3 dias"}, {"n": "Paracetamol 500 mg", "a": "Comprimido", "p": "1 comprimido de 6 em 6 horas, se dor, por até 3 dias"}, {"n": "Paracetamol 750 mg", "a": "Comprimido", "p": "1 comprimido de 8 em 8 horas, se dor, por até 3 dias"}, {"n": "Paracetamol 200 mg/ml", "a": "Solução oral", "p": "Conforme o peso, a cada 6 horas, se dor"}]}, {"g": "Anti-inflamatórios", "via": "Oral", "obs": "Orientar uso após as refeições e verificar histórico gástrico.", "itens": [{"n": "Ibuprofeno 400 mg", "a": "Comprimido", "p": "1 comprimido de 8 em 8 horas, após as refeições, por 3 dias"}, {"n": "Ibuprofeno 600 mg", "a": "Comprimido", "p": "1 comprimido de 8 em 8 horas, após as refeições, por 3 dias"}, {"n": "Nimesulida 100 mg", "a": "Comprimido", "p": "1 comprimido de 12 em 12 horas, após as refeições, por 3 dias"}, {"n": "Diclofenaco potássico 50 mg", "a": "Comprimido", "p": "1 comprimido de 8 em 8 horas, após as refeições, por 3 dias"}, {"n": "Cetoprofeno 100 mg", "a": "Comprimido", "p": "1 comprimido de 12 em 12 horas, após as refeições, por 3 dias"}]}, {"g": "Corticoides", "via": "Oral", "obs": "Uso curto, para edema pós-operatório.", "itens": [{"n": "Dexametasona 4 mg", "a": "Comprimido", "p": "1 comprimido 1 hora antes do procedimento, dose única"}, {"n": "Betametasona 2 mg", "a": "Comprimido", "p": "1 comprimido 1 hora antes do procedimento, dose única"}, {"n": "Prednisolona 20 mg", "a": "Comprimido", "p": "1 comprimido ao dia, pela manhã, por 3 dias"}]}, {"g": "Antibióticos", "via": "Oral", "obs": "Orientar completar todo o período, mesmo com melhora dos sintomas.", "itens": [{"n": "Amoxicilina 500 mg", "a": "Cápsula", "p": "1 cápsula de 8 em 8 horas, por 7 dias"}, {"n": "Amoxicilina 875 mg com clavulanato 125 mg", "a": "Comprimido", "p": "1 comprimido de 12 em 12 horas, por 7 dias"}, {"n": "Azitromicina 500 mg", "a": "Comprimido", "p": "1 comprimido ao dia, por 3 dias"}, {"n": "Clindamicina 300 mg", "a": "Cápsula", "p": "1 cápsula de 6 em 6 horas, por 7 dias"}, {"n": "Metronidazol 400 mg", "a": "Comprimido", "p": "1 comprimido de 8 em 8 horas, por 7 dias"}, {"n": "Cefalexina 500 mg", "a": "Cápsula", "p": "1 cápsula de 6 em 6 horas, por 7 dias"}, {"n": "Amoxicilina 500 mg, profilaxia", "a": "Cápsula", "p": "4 cápsulas, 2 g, em dose única, 1 hora antes do procedimento"}]}, {"g": "Antissépticos e uso tópico bucal", "via": "Tópica bucal", "obs": "", "itens": [{"n": "Digluconato de clorexidina 0,12%", "a": "Solução para bochecho 250 ml", "p": "Bochechar 15 ml por 1 minuto, 2 vezes ao dia, por 7 dias"}, {"n": "Digluconato de clorexidina 2%", "a": "Gel", "p": "Aplicar na área indicada, 2 vezes ao dia"}, {"n": "Cloridrato de benzidamina 0,15%", "a": "Solução para bochecho", "p": "Bochechar 15 ml, 3 vezes ao dia"}, {"n": "Triancinolona acetonida 0,1% em orabase", "a": "Pomada", "p": "Aplicar na lesão, 3 vezes ao dia, após as refeições"}]}, {"g": "Antifúngicos", "via": "Tópica bucal ou oral", "obs": "", "itens": [{"n": "Nistatina 100.000 UI/ml", "a": "Suspensão oral", "p": "Bochechar 5 ml e engolir, 4 vezes ao dia, por 14 dias"}, {"n": "Miconazol gel oral 2%", "a": "Gel", "p": "Aplicar na área, 4 vezes ao dia, por 14 dias"}, {"n": "Fluconazol 150 mg", "a": "Cápsula", "p": "1 cápsula, dose única"}]}, {"g": "Antivirais", "via": "Oral ou tópica", "obs": "", "itens": [{"n": "Aciclovir 200 mg", "a": "Comprimido", "p": "1 comprimido 5 vezes ao dia, por 5 dias"}, {"n": "Aciclovir creme 50 mg/g", "a": "Creme", "p": "Aplicar na lesão 5 vezes ao dia, por 4 dias"}]}, {"g": "Flúor e prevenção", "via": "Tópica", "obs": "", "itens": [{"n": "Verniz de flúor 5%", "a": "Uso em consultório", "p": "Aplicação profissional"}, {"n": "Gel de flúor fosfato acidulado 1,23%", "a": "Uso em consultório", "p": "Aplicação profissional, 4 minutos"}, {"n": "Dentifrício com 5.000 ppm de flúor", "a": "Creme dental", "p": "Escovar 3 vezes ao dia"}]}], "bloqueados": [{"n": "Medicamentos sujeitos a controle especial", "motivo": "Entorpecentes, psicotrópicos e demais substâncias das listas da Portaria SVS/MS nº 344/1998 exigem receituário de controle especial numerado, fora deste módulo. Opioides e benzodiazepínicos entram aqui."}], "limites": [], "procedimentos": [{"n": "Consulta e avaliação", "p": 0, "d": 40}, {"n": "Profilaxia e limpeza", "p": 0, "d": 45}, {"n": "Raspagem e alisamento radicular, por sextante", "p": 0, "d": 60}, {"n": "Restauração em resina, uma face", "p": 0, "d": 45}, {"n": "Restauração em resina, duas faces", "p": 0, "d": 60}, {"n": "Restauração em resina, três faces", "p": 0, "d": 75}, {"n": "Tratamento endodôntico, unirradicular", "p": 0, "d": 90}, {"n": "Tratamento endodôntico, birradicular", "p": 0, "d": 110}, {"n": "Tratamento endodôntico, multirradicular", "p": 0, "d": 130}, {"n": "Exodontia simples", "p": 0, "d": 45}, {"n": "Exodontia de terceiro molar incluso", "p": 0, "d": 90}, {"n": "Clareamento de consultório, sessão", "p": 0, "d": 75}, {"n": "Clareamento caseiro supervisionado", "p": 0, "d": 45}, {"n": "Coroa provisória", "p": 0, "d": 60}, {"n": "Coroa em cerâmica", "p": 0, "d": 90}, {"n": "Faceta em resina", "p": 0, "d": 90}, {"n": "Placa de bruxismo", "p": 0, "d": 60}, {"n": "Radiografia periapical", "p": 0, "d": 15}, {"n": "Aplicação de flúor", "p": 0, "d": 20}, {"n": "Selante, por dente", "p": 0, "d": 25}], "documentos": [{"t": "Termo de consentimento para tratamento odontológico", "c": "Declaro que fui informado, em linguagem que compreendi, sobre o diagnóstico, o plano de tratamento proposto, as alternativas existentes, o número de sessões previsto, o valor, os riscos do tratamento e também os riscos de não tratar.\n\nFui informado sobre a necessidade de comparecer às consultas de acompanhamento e sobre os cuidados de higiene em casa.\n\nTive a oportunidade de fazer perguntas e todas foram respondidas.\n\nAutorizo a realização do tratamento."}, {"t": "Orientações após exodontia", "c": "Depois da extração:\n\n1. Morder a gaze por 30 minutos, sem trocar a toda hora.\n2. Aplicar compressa fria no rosto, 20 minutos sim e 20 minutos não, nas primeiras 24 horas.\n3. Alimentação fria ou morna e pastosa nas primeiras 24 horas.\n4. Não bochechar, não cuspir com força e não usar canudo por 48 horas.\n5. Não fumar e não consumir bebida alcoólica por 72 horas.\n6. Escovar os dentes normalmente, com cuidado na região operada.\n7. Dormir com a cabeça mais elevada na primeira noite.\n8. Tomar os medicamentos conforme a receita.\n9. Entrar em contato com o consultório se houver sangramento que não para, dor que aumenta depois do terceiro dia, febre ou inchaço crescente."}, {"t": "Orientações após tratamento endodôntico", "c": "Depois do tratamento de canal:\n\n1. É normal sentir sensibilidade à mastigação por alguns dias.\n2. Evitar mastigar do lado tratado até a restauração definitiva.\n3. Tomar a medicação conforme a receita.\n4. Retornar na data marcada para a restauração definitiva ou coroa. O dente sem restauração definitiva pode fraturar.\n5. Entrar em contato se houver dor intensa, inchaço ou febre."}, {"t": "Orientações de clareamento dental", "c": "Durante o clareamento:\n\n1. Evitar café, chá preto, vinho tinto, refrigerante escuro, molho de tomate, açaí e beterraba.\n2. Evitar cigarro.\n3. Sensibilidade é esperada e passageira. Use o dentifrício indicado.\n4. Usar a moldeira pelo tempo orientado, sem exagerar na quantidade de gel.\n5. Manter a higiene e comparecer às consultas de acompanhamento."}, {"t": "Atestado de comparecimento", "c": "Atesto, para os devidos fins, que a pessoa acima compareceu a este consultório odontológico nesta data, para atendimento, no período indicado abaixo.\n\nHorário de entrada:\nHorário de saída:"}, {"t": "Encaminhamento para especialista", "c": "Encaminho a pessoa acima para avaliação com especialista.\n\nEspecialidade:\nMotivo do encaminhamento:\nAchados clínicos e radiográficos:\n\nFico à disposição para prestar as informações que forem necessárias."}]}, "podologia": {"rotulo": "Podologia", "base": "Lei nº 13.643/2018 e Código de Ética dos Profissionais de Podologia", "prescreve": false, "motivoSemReceita": "O artigo 61 do Código de Ética dos Profissionais de Podologia veda ao podólogo prescrever medicamentos. O que este módulo emite é a indicação de produtos de higiene, hidratação e cuidado para uso em casa, inclusive formulações de farmácia de manipulação e antifúngicos de venda livre, além dos documentos que o podólogo assina. Medicamento sujeito a prescrição continua sendo do médico, e para isso existe o modelo de encaminhamento.", "grupos": [{"g": "Higiene e antissepsia", "via": "Uso tópico, em casa", "obs": "Produtos de higiene e cosméticos, inclusive de farmácia de manipulação.", "itens": [{"n": "Sabonete líquido antisséptico para os pés", "a": "Frasco 200 ml", "p": "Lavar os pés uma vez ao dia, enxaguando bem e secando entre os dedos"}, {"n": "Sabonete com ácido salicílico 2%", "a": "Manipulado, barra ou líquido", "p": "Usar na região de calosidade, uma vez ao dia"}, {"n": "Sabonete com enxofre", "a": "Manipulado, barra", "p": "Usar uma vez ao dia"}, {"n": "Solução de permanganato de potássio", "a": "Uso externo, conforme diluição da farmácia", "p": "Escalda-pés por 10 minutos, conforme orientação"}, {"n": "Talco antisséptico para os pés", "a": "Frasco 100 g", "p": "Aplicar nos pés e no calçado, após a higiene"}, {"n": "Spray antisséptico para calçado", "a": "Frasco 100 ml", "p": "Aplicar no interior do calçado, todos os dias, à noite"}]}, {"g": "Hidratação e queratose", "via": "Uso tópico, em casa", "obs": "Evitar a região entre os dedos.", "itens": [{"n": "Creme de ureia 10%", "a": "Bisnaga 100 g", "p": "Aplicar nos pés uma vez ao dia, à noite, evitando entre os dedos"}, {"n": "Creme de ureia 20%", "a": "Bisnaga 100 g", "p": "Aplicar na região ressecada uma vez ao dia"}, {"n": "Creme de ureia 30%", "a": "Manipulado, bisnaga 100 g", "p": "Aplicar na calosidade uma vez ao dia, à noite"}, {"n": "Creme de ureia 20% com ácido salicílico 3%", "a": "Manipulado", "p": "Aplicar somente na calosidade, à noite"}, {"n": "Creme de ureia 10% com lactato de amônio", "a": "Manipulado", "p": "Aplicar uma vez ao dia"}, {"n": "Óleo de amêndoas ou de girassol", "a": "Frasco 100 ml", "p": "Aplicar após o banho, com os pés ainda úmidos"}]}, {"g": "Antifúngicos de venda livre", "via": "Uso tópico, em casa", "obs": "Produtos isentos de prescrição médica. Quadro que não melhora em quatro semanas deve ser encaminhado ao médico.", "itens": [{"n": "Nitrato de miconazol 2% creme", "a": "Bisnaga 28 g", "p": "Aplicar duas vezes ao dia, por quatro semanas"}, {"n": "Nitrato de miconazol 2% pó", "a": "Frasco 30 g", "p": "Aplicar nos pés e no calçado, uma vez ao dia"}, {"n": "Cloridrato de terbinafina 1% creme", "a": "Bisnaga 15 g", "p": "Aplicar uma vez ao dia, por duas semanas"}, {"n": "Nitrato de isoconazol 1% creme", "a": "Bisnaga 20 g", "p": "Aplicar duas vezes ao dia"}, {"n": "Esmalte de amorolfina 5%", "a": "Frasco 2,5 ml", "p": "Aplicar na unha uma vez por semana"}]}, {"g": "Conforto e proteção", "via": "Uso externo", "obs": "", "itens": [{"n": "Palmilha de silicone", "a": "Par", "p": "Usar no calçado do dia a dia"}, {"n": "Protetor de silicone para dedo", "a": "Unidade", "p": "Usar durante o uso do calçado"}, {"n": "Separador de dedos em silicone", "a": "Par", "p": "Usar à noite ou conforme orientação"}, {"n": "Meia de algodão sem costura", "a": "Par", "p": "Trocar diariamente"}]}], "bloqueados": [], "limites": [], "procedimentos": [{"n": "Avaliação podológica inicial", "p": 0, "d": 40}, {"n": "Podologia clínica completa", "p": 0, "d": 50}, {"n": "Tratamento de onicocriptose, unha encravada", "p": 0, "d": 45}, {"n": "Colocação de órtese de silicone", "p": 0, "d": 45}, {"n": "Confecção de órtese ungueal", "p": 0, "d": 50}, {"n": "Tratamento de hiperqueratose e calosidade", "p": 0, "d": 40}, {"n": "Tratamento de fissura em calcâneo", "p": 0, "d": 40}, {"n": "Onicomicose, protocolo a laser, sessão", "p": 0, "d": 40}, {"n": "Reconstrução ungueal", "p": 0, "d": 45}, {"n": "Debridamento de helomas, calos", "p": 0, "d": 40}, {"n": "Atendimento ao pé diabético, protocolo de cuidado", "p": 0, "d": 60}, {"n": "Reflexologia podal", "p": 0, "d": 60}, {"n": "Spa dos pés", "p": 0, "d": 60}, {"n": "Retorno de acompanhamento", "p": 0, "d": 30}, {"n": "Aplicação de ácido em consultório, conforme protocolo", "p": 0, "d": 30}], "documentos": [{"t": "Indicação de produtos para uso em casa", "c": "Indicação de produtos de higiene, hidratação e cuidado para uso em casa. Este documento não é prescrição de medicamento. O podólogo não prescreve medicamentos, conforme o artigo 61 do Código de Ética dos Profissionais de Podologia. Qualquer medicamento sujeito a prescrição deve ser indicado por médico.\n\nProdutos indicados:\n\n\nComo usar:\n\n\nPor quanto tempo:\n\n\nRetorno para reavaliação:"}, {"t": "Orientação de cuidados em casa", "c": "Orientações após o atendimento podológico:\n\n1. Manter os pés limpos e bem secos, principalmente entre os dedos.\n2. Hidratar diariamente, evitando a região entre os dedos.\n3. Cortar as unhas retas, sem aprofundar os cantos.\n4. Usar calçado confortável, que não aperte os dedos nem escorregue no calcanhar.\n5. Trocar as meias todos os dias e dar preferência às de algodão.\n6. Não usar objetos cortantes, lixas de metal ou produtos calicidas por conta própria.\n7. Observar mudanças de cor, inchaço, dor, calor local ou secreção e avisar a clínica.\n8. Retornar na data combinada para o acompanhamento."}, {"t": "Orientação para pessoa com diabetes", "c": "Cuidados com os pés para quem tem diabetes:\n\n1. Examinar os pés todos os dias, inclusive a sola, com a ajuda de um espelho ou de outra pessoa.\n2. Lavar com água morna, nunca quente, e secar bem entre os dedos.\n3. Hidratar a pele, evitando a região entre os dedos.\n4. Nunca andar descalço, nem dentro de casa.\n5. Conferir o interior do calçado com a mão antes de calçar.\n6. Não tratar calos, verrugas ou unhas encravadas por conta própria.\n7. Procurar atendimento imediato se aparecer ferida, bolha, rachadura, mudança de cor ou perda de sensibilidade.\n8. Manter o acompanhamento médico e o controle da glicemia em dia."}, {"t": "Encaminhamento para avaliação médica", "c": "Encaminho a pessoa acima para avaliação médica.\n\nMotivo do encaminhamento:\n\nAchados observados durante o atendimento podológico:\n\nFico à disposição para prestar as informações que forem necessárias sobre o atendimento realizado."}, {"t": "Termo de consentimento para o atendimento", "c": "Declaro que fui informado, em linguagem que compreendi, sobre o atendimento podológico a ser realizado, suas etapas, a finalidade, os cuidados posteriores e os riscos envolvidos.\n\nTive a oportunidade de fazer perguntas e todas foram respondidas.\n\nFui informado de que o podólogo não prescreve medicamentos e de que, havendo necessidade, serei encaminhado para avaliação médica.\n\nAutorizo a realização do atendimento."}, {"t": "Termo de autorização de uso de imagem", "c": "Autorizo o registro fotográfico dos meus pés antes e depois do atendimento, para fins de acompanhamento da evolução do tratamento no meu prontuário.\n\nEstou ciente de que o uso das imagens para divulgação depende de autorização específica e separada, que não está sendo dada neste termo.\n\nEstou ciente de que posso revogar esta autorização a qualquer momento, nos termos do artigo 18 da Lei nº 13.709 de 2018."}], "indica": true, "cabecalho": "Indicação de produtos de higiene, hidratação e cuidado para uso em casa. Este documento não é prescrição de medicamento. O podólogo não prescreve medicamentos, conforme o artigo 61 do Código de Ética dos Profissionais de Podologia. Qualquer medicamento sujeito a prescrição deve ser indicado por médico."}};
  window.BF_CATALOGOS = CAT;

  function seg() { try { return (S && S.config && S.config.segmento) || ''; } catch (e) { return ''; } }
  function atual() { return CAT[seg()] || null; }
  function id() { return Math.random().toString(36).slice(2, 10); }
  function num(v) { var m = String(v == null ? '' : v).replace(',', '.').match(/(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : null; }

  /* ---------- Semear ---------- */
  function semearProcedimentos(c) {
    var tem = {};
    (S.servicos || []).forEach(function (x) { tem[String(x.nome || '').toLowerCase()] = 1; });
    var n = 0;
    (c.procedimentos || []).forEach(function (x) {
      if (tem[x.n.toLowerCase()]) return;
      S.servicos.push({ id: id(), nome: x.n, preco: x.p, duracao: x.d, ativo: true });
      n++;
    });
    return n;
  }
  function semearDocumentos(c) {
    S.config.modelosDoc = S.config.modelosDoc || [];
    var tem = {};
    S.config.modelosDoc.forEach(function (x) { tem[String(x.titulo || '').toLowerCase()] = 1; });
    var n = 0;
    (c.documentos || []).forEach(function (d) {
      if (tem[d.t.toLowerCase()]) return;
      S.config.modelosDoc.push({ id: id(), titulo: d.t, corpo: d.c, origem: 'catalogo' });
      n++;
    });
    return n;
  }

  /* ---------- Travas da norma ---------- */
  window.bfRxConferir = function (texto) {
    var c = atual();
    if (!c) return { ok: true };
    var t = String(texto || '').toLowerCase();
    var i, b;
    for (i = 0; i < (c.bloqueados || []).length; i++) {
      b = c.bloqueados[i];
      var chave = b.n.toLowerCase().split(',')[0].trim();
      if (chave && t.indexOf(chave) >= 0) return { ok: false, motivo: b.motivo };
      if (/pmma|polimetilmetacrilato/.test(t) && /pmma/i.test(b.n)) return { ok: false, motivo: b.motivo };
    }
    for (i = 0; i < (c.limites || []).length; i++) {
      var L = c.limites[i];
      if (t.indexOf(L.termo) < 0) continue;
      var pct = num((String(texto).match(/(\d+(?:[.,]\d+)?)\s*%/) || [])[1]);
      if (pct == null) continue;
      if (pct > L.clinica) return { ok: false, motivo: L.texto };
      if (pct > L.dom) return { ok: true, aviso: L.texto };
    }
    return { ok: true };
  };

  /* ---------- Escolher do catálogo ---------- */
  function campo(n) { return document.querySelector('[name="' + n + '"], #' + n); }
  function preencher(item, grupo) {
    var alvos = [
      ['bfrec-med', item.n], ['bfrec-apresentacao', item.a || ''],
      ['bfrec-via', grupo.via || ''], ['bfrec-posologia', item.p || '']
    ];
    var achou = 0;
    alvos.forEach(function (par) {
      var el = campo(par[0]);
      if (!el) return;
      el.value = par[1];
      el.dispatchEvent(new Event('input', { bubbles: true }));
      achou++;
    });
    if (!achou) {
      var t = campo('bfrec-texto');
      var linha = item.n + (item.a ? ' — ' + item.a : '') +
        (grupo.via ? '\nVia: ' + grupo.via : '') + (item.p ? '\n' + item.p : '');
      if (t) { t.value = (t.value ? t.value + '\n\n' : '') + linha; t.dispatchEvent(new Event('input', { bubbles: true })); achou = 1; }
    }
    var r = window.bfRxConferir(item.n);
    if (r.aviso) toast(r.aviso);
    if (!achou) toast('Abra o receituário para usar o catálogo.');
    fecha2();
  }
  window.__bfEscolher = function (gi, ii) {
    var c = atual(); if (!c) return;
    preencher(c.grupos[gi].itens[ii], c.grupos[gi]);
  };

  window.bfRxCatalogo = function () {
    var c = atual();
    if (!c) { toast('Este segmento não tem catálogo.'); return; }
    if (!c.prescreve && !c.indica) {
      abre2('<h3>Receituário não se aplica a este segmento</h3><p class="sub">' + esc(c.motivoSemReceita) + '</p>' +
        '<div class="mact"><button class="btn" onclick="fecha2()">Entendi</button></div>');
      return;
    }
    var titulo = c.prescreve ? 'Catálogo do seu segmento' : 'Produtos que você pode indicar';
    var html = '<h3>' + titulo + '</h3>' +
      (c.cabecalho ? '<div class="card" style="margin:0 0 10px;border-left:4px solid var(--acc,#5a4cfb)"><p class="sub" style="margin:0">' + esc(c.cabecalho) + '</p></div>' : '') +
      '<p class="sub">Toque no item para ele entrar no documento já preenchido. Base: ' + esc(c.base) + '.</p>' +
      '<input id="bfCatBusca" placeholder="Buscar substância ou medicamento" style="width:100%;margin:10px 0;padding:10px;border:1px solid var(--bd,#d4d8e3);border-radius:8px" oninput="__bfFiltrar(this.value)">';
    c.grupos.forEach(function (g, gi) {
      html += '<div class="card bfcat-g" data-g="' + gi + '" style="margin-bottom:10px"><b>' + esc(g.g) + '</b>' +
        '<p class="sub" style="margin:2px 0 8px">Via: ' + esc(g.via) + (g.obs ? '. ' + esc(g.obs) : '') + '</p>';
      g.itens.forEach(function (it, ii) {
        html += '<div class="row bfcat-i" data-t="' + esc((it.n + ' ' + (it.a || '')).toLowerCase()) + '">' +
          '<span>' + esc(it.n) + '<br><small style="color:var(--mut);font-weight:400">' + esc(it.a || '') + (it.p ? ' · ' + esc(it.p) : '') + '</small></span>' +
          '<span><button type="button" class="btn sm" onclick="__bfEscolher(' + gi + ',' + ii + ')">Usar</button></span></div>';
      });
      html += '</div>';
    });
    (c.bloqueados || []).forEach(function (b) {
      html += '<div class="card" style="margin-bottom:10px;border-left:4px solid var(--bad,#e11d48)"><b>Fora do catálogo: ' + esc(b.n) + '</b>' +
        '<p class="sub" style="margin:4px 0 0">' + esc(b.motivo) + '</p></div>';
    });
    html += '<div class="mact"><button class="btn ghost" onclick="fecha2()">Fechar</button></div>';
    abre2(html, '820px');
  };
  window.__bfFiltrar = function (q) {
    q = String(q || '').toLowerCase().trim();
    document.querySelectorAll('#modalRoot2 .bfcat-g').forEach(function (g) {
      var n = 0;
      g.querySelectorAll('.bfcat-i').forEach(function (it) {
        var ok = !q || it.dataset.t.indexOf(q) >= 0;
        it.style.display = ok ? '' : 'none';
        if (ok) n++;
      });
      g.style.display = n ? '' : 'none';
    });
  };

  /* ---------- Janela da primeira entrada ---------- */
  function janelaEscolha(c) {
    var nProc = (c.procedimentos || []).length;
    var nDoc = (c.documentos || []).length;
    var nRx = (c.grupos || []).reduce(function (a, g) { return a + g.itens.length; }, 0);
    var linhas = '<li>' + nProc + ' procedimentos com o tempo de cada um, sem preço, para você usar a sua tabela</li>' +
      '<li>' + nDoc + ' modelos de documento prontos para imprimir ou mandar</li>' +
      (nRx ? '<li>' + nRx + ' itens no catálogo ' + (c.prescreve ? 'de prescrição' : 'de produtos que você pode indicar, de sabonete manipulado a creme de ureia e antifúngico de venda livre') + ', organizados por grupo</li>' : '') +
      (c.prescreve ? '' : '<li>Sem receituário de medicamento sujeito a prescrição, que continua sendo do médico, pelo artigo 61 do Código de Ética da Podologia</li>');
    openModal(
      '<h3>O seu ' + esc(c.rotulo) + ' já vem montado</h3>' +
      '<p class="sub">Preparei o sistema com o que o seu ramo usa no dia a dia, para você não começar do zero:</p>' +
      '<ul class="sub" style="margin:10px 0 14px;padding-left:20px;line-height:1.7">' + linhas + '</ul>' +
      '<p class="sub">Base usada: ' + esc(c.base) + '. O preço fica em branco de propósito: a tabela é sua. Tudo pode ser alterado depois, item por item.</p>' +
      '<div class="mact" style="flex-wrap:wrap">' +
      '<button class="btn" onclick="bfCatAplicar()">Manter assim, está bom</button>' +
      '<button class="btn ghost" onclick="bfCatRecusar()">Prefiro montar do meu jeito</button>' +
      '</div>', true);
  }
  window.bfCatAplicar = function () {
    var c = atual(); if (!c) { closeModal(); return; }
    var p = semearProcedimentos(c), d = semearDocumentos(c);
    S.config.catalogoPronto = seg() + ':' + new Date().toISOString().slice(0, 10);
    save(); closeModal();
    if (typeof render === 'function') render();
    toast('Pronto: ' + p + ' procedimentos e ' + d + ' documentos cadastrados.');
  };
  window.bfCatRecusar = function () {
    S.config.catalogoPronto = seg() + ':recusado';
    save(); closeModal();
    toast('Sem problema. O catálogo continua disponível no botão Catálogo, dentro do receituário.');
  };

  /* Botão do catálogo dentro do receituário, para a pessoa não digitar
     nome de medicamento na mão. */
  function botaoNoReceituario() {
    try {
      var c = atual(); if (!c || (!c.prescreve && !c.indica)) return;
      var alvo = campo('bfrec-med') || campo('bfrec-texto');
      if (!alvo) return;
      var caixa = alvo.closest('label') || alvo.parentNode;
      if (!caixa || caixa.parentNode.querySelector('.bf-cat-btn')) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn sm bf-cat-btn';
      b.style.margin = '8px 0';
      b.textContent = c.prescreve ? 'Escolher do catálogo' : 'Escolher produto para indicar';
      b.addEventListener('click', function (e) { e.preventDefault(); window.bfRxCatalogo(); });
      caixa.parentNode.insertBefore(b, caixa);
    } catch (e) { }
  }
  var obsRx = new MutationObserver(function () { botaoNoReceituario(); });
  obsRx.observe(document.body, { childList: true, subtree: true });

  function tentar() {
    try {
      if (typeof S === 'undefined' || !S || !S.config) return;
      if (typeof UI !== 'undefined' && UI && UI.auth) return;
      var c = atual(); if (!c) return;
      if (String(S.config.catalogoPronto || '').indexOf(seg() + ':') === 0) return;
      /* Conta que ja roda nao recebe esta janela: ela e para quem esta
         comecando. Quem ja tem servico ou paciente cadastrado so ve o
         catalogo se abrir pelo botao, dentro do receituario. */
      var jaUsa = ((S.servicos || []).length > 0) || ((S.pacientes || []).length > 0) || ((S.agendamentos || []).length > 0);
      if (jaUsa) { S.config.catalogoPronto = seg() + ':conta-existente'; save(); return; }
      var raiz = document.getElementById('modalRoot');
      if (raiz && raiz.innerHTML) return;
      janelaEscolha(c);
    } catch (e) { }
  }
  var t = setInterval(tentar, 2000);
  setTimeout(function () { clearInterval(t); }, 180000);
})();
