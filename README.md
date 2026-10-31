
<div align="center">

# ApisGol

<img width="1000" height="300" alt="ApisGol" src="https://github.com/user-attachments/assets/b21fca12-0515-4b94-98a4-d2e1bceb8dd4" />

## Un par de defensas para los regates de la IA ⚽

**Por aquí os dejo estos porteros que a mí me han ahorrado unas cuantas horas de curro. Por si os sirven de ayuda.**

</div>

---

### Que compilar no significa que hayamos ganado el partido

La IA y sus regates nos juegan muy bonito, **todo en verde y un partidazo**. Pero 1 segundo de confianza, y **nos la mete por la escuadra**. De esos goles estos porteros. No la echan del partido, pero ayudan a que **juegue más despacio y cometa menos faltas**.

---

### ¿Qué hay en el banquillo?

Iré dejando algunas de las defensas que utilizo en mis partidos. Cada uno tiene su equipo y sus propias reglas. **No están preparados para jugar en todos los campos.** Algunos necesitarán unos retoques y otros menos.

> [!TIP]
> **Son gratuitos. Cógelos, adáptalos a tu equipo y ponlos a jugar.**

---

### ¿Cómo los pones a jugar?

| | |
|:---:|---|
| **1** | Descarga la defensa que te interesa. |
| **2** | Echa un vistazo a lo que en la línea que juega. |
| **3** | Explícale tus reglas. |
| **4** | Pita el inicio y descubre si tienes algún agujero en la defensa. |

> Y si te empieza a sacar faltas, tampoco te enfades con el árbitro. **Para eso está.**

---

### ¿Te apuntas al equipo?

Si ocurre una mejora o tienes alguna regla interesante que agregar, puedes abrir un **Issue** o enviar un **Pull Request**. **Aquí se aceptan refuerzos para la defensa.**

---

### Licencia

**MIT.** Gratis para usar, modificar y compartir. Sin garantías ni compromiso de soporte. Cada uno entrena a sus propias defensas.

> [!IMPORTANT]
> **Y recuerda: que el marcador esté en verde no significa que el partido esté ganado.**

---

### Las cinco defensas

Estos son los primeros cinco verificadores que comparto. Cada uno se centra en un aspecto diferente de la calidad del código.

| Verificador | Qué comprueba |
|---|---|
| [**verify-error-handling.mts**](verificadores/verify-error-handling.mts) | Detecta errores silenciados, promesas que ocultan fallos, respuestas HTTP ignoradas y otras situaciones en las que un error puede desaparecer sin avisar. |
| [**verify-trampas.mts**](verificadores/verify-trampas.mts) | Vigila que nadie engañe a los demás verificadores: comprobaciones apagadas con `@ts-ignore` o `eslint-disable`, tipos forzados, la consola disfrazada, avisos que no avisan, código que nadie revisa y ajustes que esconden errores. |
| [**verify-runtime-safety.ts**](verificadores/verify-runtime-safety.ts) | Revisa operaciones que pueden provocar fallos durante la ejecución: JSON sin proteger, variables de entorno que se dan por hechas, respuestas HTTP sin comprobar y listas que pueden venir vacías. |
| [**find-hardcoded-colors.ts**](verificadores/find-hardcoded-colors.ts) | Localiza colores escritos directamente en el código fuera de los archivos del tema, para mantener la coherencia del sistema de estilos. |
| [**verify-falsificaciones.mts**](verificadores/verify-falsificaciones.mts) | Lee el proyecto entero con el comprobador de tipos y caza lo que se da por bueno sin comprobarlo: comprobaciones de tipo hechas a mano, notas que citan líneas que no existen, valores vacíos por defecto, listas recortadas sin avisar, código que nadie usa, fallos de `Promise.allSettled` que nadie mira y código comentado. |

Cada archivo contiene sus propias comprobaciones. Puedes consultar el código para conocer las reglas que aplica y su funcionamiento.

> [!NOTE]
> **Antes de pitar el inicio:** `verify-error-handling`, `verify-trampas` y `verify-falsificaciones` se lanzan con Node 22.18 o superior y usan el paquete `typescript` del proyecto; `verify-trampas` y `verify-falsificaciones` tienen que jugar dentro de un repositorio git. `verify-runtime-safety` y `find-hardcoded-colors` se lanzan con `ts-node`. Todos desde la raíz del proyecto:

```bash
node verificadores/verify-error-handling.mts
```

```bash
npx ts-node verificadores/verify-runtime-safety.ts
```

**Si no encuentran nada que revisar, no dan el partido por ganado: terminan en rojo.**
